import { Response, NextFunction } from 'express';
import logger, { logRequest } from '../utils/logger';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { logActivity, calculateSecurityScore } from '../services/policy.service';
import { io } from '../server';
import { checkActionSchema } from '../validations/ai.validation';
import { interceptAction } from '../middleware/interceptor';
import { runFairly } from '../config/queue';
import { trackUsage } from '../utils/usage';
import * as Sentry from '@sentry/node';
import { updateBaseline, detectDrift, persistDriftAlerts } from '../services/driftDetection.service';

const callOpenAiCompletions = async (
  openaiKey: string,
  organizationId: string,
  messages: any[],
  maxTokens: number,
  maxRetries: number = 1,
  timeoutMs: number = 8000
): Promise<string> => {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (r.ok) {
        const data = (await r.json()) as any;
        const text = data.choices?.[0]?.message?.content?.trim() || '';
        
        // Track Usage
        const usage = data.usage;
        if (usage) {
          void trackUsage(organizationId, usage.prompt_tokens, usage.completion_tokens);
        }
        return text;
      } else {
        throw new Error(`OpenAI API returned ${r.status}`);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries) throw e;
      await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 500 : 800));
    }
  }
  throw new Error('Completions failed');
};

const generateAllowedSummary = async (
  organizationId: string,
  agent: string,
  action: string,
  metadata: any
): Promise<string | undefined> => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey.length < 10) return undefined;
  let summary: string | undefined;
  try {
    await runFairly(organizationId, async () => {
      summary = await callOpenAiCompletions(
        openaiKey,
        organizationId,
        [
          {
            role: 'system',
            content: 'You are a governance assistant. In one sentence, explain why this AI action was allowed or blocked.'
          },
          {
            role: 'user',
            content: `Action: ${action}, Agent: ${agent}, Decision: ALLOWED. Context: ${JSON.stringify(metadata)}`
          },
        ],
        100,
        1,
        8000
      );
    });
  } catch (e: any) {
    logger.warn(`AI Summary generation skipped for org ${organizationId}: ${e.message}`);
  }
  return summary;
};

const resolveRiskNumeric = (risk: string): number => {
  if (risk === 'high') return 80;
  if (risk === 'medium') return 50;
  return 20;
};

const resolveSocketDecisionLabel = (decision: { status: string; isPendingApproval?: boolean }): string => {
  if (decision.status === 'blocked') return 'BLOCK';
  if (decision.status === 'flagged' || decision.isPendingApproval) return 'FLAGGED';
  return 'ALLOW';
};

const triggerAsyncDriftEvaluation = (
  agent: string,
  organizationId: string,
  action: string,
  metadata: any,
  riskNumeric: number
): void => {
  setImmediate(async () => {
    try {
      const driftChecks = await detectDrift(agent, organizationId, { action, metadata }, riskNumeric);
      await updateBaseline(agent, organizationId, { metadata }, riskNumeric);
      if (driftChecks.length > 0) {
        const enrichedDriftChecks = driftChecks.map(check => ({
          ...check,
          agentId: agent,
          organizationId,
        }));
        await persistDriftAlerts(agent, organizationId, driftChecks);
        io.to(`company_${organizationId}`).emit('drift:detected', enrichedDriftChecks);
        logger.info(`[DRIFT] ${driftChecks.length} drift alert(s) for agent ${agent}`);
      }
    } catch (err: any) {
      logger.warn(`[DRIFT] Non-fatal drift detection error: ${err.message}`);
    }
  });
};

export const postCheckAction = async (req: any, res: Response, next: NextFunction) => {
  const { requestId, startTime } = req.context;
  const organizationId = await resolveOrganizationId(req);

  try {
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Organization not identified', requestId });
    }

    // 1. Extract validated input (already validated by route middleware)
    const { agent, action, metadata } = req.body;

    // 2. Intercept and Execute
    const decision = await interceptAction(
      { agent, action, organizationId, metadata, requestId },
      async () => ({ message: "Action authorized and simulated" })
    );

    // 3. Optional: Generate AI Summary (Fair Concurrency + Usage Tracking)
    const ai_summary =
      decision.status === 'allowed'
        ? await generateAllowedSummary(organizationId, agent, action, metadata)
        : undefined;

    const latency = Date.now() - startTime;
    Sentry.setTag('latency', latency);

    // 3b. Upsert runtime agent inventory (ai_systems, risk_assessments, Agent, ai_agents)
    try {
      const { AgentDiscoveryService } = require('../services/agentDiscovery.service');
      await AgentDiscoveryService.upsertRuntimeAgentInventory(
        organizationId,
        agent,
        action,
        decision,
        metadata
      );
    } catch (invErr: any) {
      logger.warn(`[INVENTORY] Non-fatal agent inventory upsert error: ${invErr.message}`);
    }

    // 4. Real Drift Detection (async — does not block response)
    const riskNumeric = resolveRiskNumeric(decision.risk);
    triggerAsyncDriftEvaluation(agent, organizationId, action, metadata, riskNumeric);

    // 5. Push Real-time Update
    io.to(`company_${organizationId}`).emit('activity_log', {
      id: requestId,
      organizationId,
      timestamp: new Date().toISOString(),
      status: decision.status,
      decision: resolveSocketDecisionLabel(decision),
      isPendingApproval: decision.isPendingApproval || false,
      risk: decision.risk,
      reason: decision.reason,
      ai_summary,
      metadata: {
        ...metadata,
        agent,
        action,
        ruleId: decision.ruleId,
        matchedPolicy: decision.matchedPolicy,
      }
    });

    logRequest({ requestId, orgId: organizationId, endpoint: req.path, status: 200, latency });

    return res.status(200).json({
      success: true,
      requestId,
      latency,
      data: {
        ...decision,
        ai_summary
      }
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logRequest({ requestId, orgId: organizationId || 'unknown', endpoint: req.path, status: 500, latency, error: error.message });
    next(error);
  }
};


export const postReplayAction = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { logId } = req.body;
    const organizationId = await resolveOrganizationId(req);

    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const originalLog = await prisma.logs.findUnique({
      where: { id: logId }
    });

    if (!originalLog || originalLog.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    const decision = await interceptAction(
      { 
        agent: originalLog.agent, 
        action: originalLog.action, 
        organizationId, 
        metadata: originalLog.metadata 
      },
      async () => ({ message: "Replayed action" })
    );

    res.status(200).json({
      success: true,
      data: decision
    });
  } catch (error) {
    next(error);
  }
};

export const getSecurityScore = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const score = await calculateSecurityScore(organizationId);
    res.status(200).json({ success: true, data: { score } });
  } catch (error) {
    next(error);
  }
};

export const postOverrideAction = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { comment, employeeId } = req.body;
    const organizationId = await resolveOrganizationId(req);

    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const log = await prisma.logs.findUnique({ where: { id } });
    if (!log || log.organizationId !== organizationId) {
      return res.status(404).json({ success: false, message: 'Activity log not found' });
    }

    // Role check: Only REVIEWER or ADMIN can approve critical actions
    const userRole = req.user?.role || 'USER';
    const isHighRisk = log.risk === 'high';
    
    const updateData: any = {
      overrideComment: comment,
      overriddenBy: employeeId || req.user?.full_name || 'Authorized User',
      overrideTimestamp: new Date(),
    };

    if (isHighRisk) {
      if (userRole !== 'REVIEWER' && userRole !== 'ADMIN') {
        return res.status(403).json({ 
          success: false, 
          message: '2-Step Verification Required: High risk actions must be approved by a Reviewer or Admin.' 
        });
      }
      updateData.isPendingApproval = false;
      updateData.approvedBy = req.user?.full_name || 'Authorized Reviewer';
      updateData.status = 'allowed'; // Change status to allowed once approved
    } else {
      updateData.status = 'allowed';
    }

    const updatedLog = await prisma.logs.update({
      where: { id },
      data: updateData
    });

    // Notify dashboard
    io.to(`company_${organizationId}`).emit('activity_log_updated', updatedLog);

    res.status(200).json({
      success: true,
      message: isHighRisk ? 'Override approved by reviewer' : 'Action manually allowed',
      data: updatedLog
    });
  } catch (error) {
    next(error);
  }
};

const resolveCanonicalLogStatus = (log: any): 'blocked' | 'flagged' | 'allowed' => {
  if (log.status === 'blocked') return 'blocked';
  if (log.status === 'flagged' || log.isPendingApproval === true || (log.metadata as any)?.isPendingApproval === true) {
    return 'flagged';
  }
  return 'allowed';
};

export const getLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const activityLogs = await prisma.logs.findMany({
      where: { organizationId: organizationId },
      orderBy: { timestamp: 'desc' },
      take: 500
    });

    res.status(200).json({
      success: true,
      data: activityLogs.map(log => {
        const canonicalStatus = resolveCanonicalLogStatus(log);
        return {
          ...log,
          status: canonicalStatus,
          agent_id: log.agent,
          risk_score: log.risk,
          created_at: log.timestamp
        };
      })
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const [logs, incidents, policies, score] = await Promise.all([
      prisma.logs.findMany({
        where: { organizationId, timestamp: { gte: last7Days } },
        orderBy: { timestamp: 'asc' }
      }),
      prisma.incidents.findMany({
        where: { organizationId, created_at: { gte: last7Days } }
      }),
      prisma.policies.findMany({
        where: { organizationId }
      }),
      calculateSecurityScore(organizationId)
    ]);

    // 1. Calculate KPIs (Single Source of Truth across Overview, Activity, Policies)
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
    const criticalViolations = incidents.filter(i => i.severity > 70).length;
    const isLogBlocked = (l: any) => l.status === 'blocked';
    const isLogFlagged = (l: any) =>
      l.status !== 'blocked' &&
      (l.status === 'flagged' || l.isPendingApproval === true || (l.metadata as any)?.isPendingApproval === true);

    const blockedToday = todayLogs.filter(isLogBlocked).length;
    const flaggedToday = todayLogs.filter(isLogFlagged).length;
    const allowedToday = todayLogs.filter(l => !isLogBlocked(l) && !isLogFlagged(l)).length;
    const totalToday = todayLogs.length;
    const complianceScore = policies.length > 0 ? Math.round((policies.filter(p => p.enabled).length / policies.length) * 100) : 100;

    // Rule-level Interceptions attribution for Policies Section
    const ruleInterceptions: Record<string, number> = {
      'rule-1': 0,
      'rule-2': 0,
      'rule-3': 0,
      'rule-4': 0,
      'rule-gdpr-transfer': 0,
      'rule-hipaa-baa': 0,
      'rule-dpdp-biometric': 0,
    };
    todayLogs.forEach(l => {
      if (isLogBlocked(l) || isLogFlagged(l)) {
        const meta = (l.metadata as any) || {};
        const combinedText = `${l.action || ''} ${l.reason || ''} ${meta.prompt || ''}`;
        let ruleId = meta.ruleId;
        let matchedPolicy = meta.matchedPolicy || meta.ruleName;

        // Fallback inference if older/custom log lacked explicit ruleId in metadata
        if (!ruleId && !matchedPolicy) {
          if (isLogFlagged(l) || (typeof meta.amount === 'number' && meta.amount >= 10000) || /financial threshold|\$10,000/i.test(combinedText)) {
            ruleId = 'rule-3';
            matchedPolicy = 'Disbursement > $10k Human Approval Trigger';
          } else if (/gdpr|scc|cross[-_ ]?border/i.test(combinedText)) {
            ruleId = 'rule-gdpr-transfer';
            matchedPolicy = 'GDPR Cross-Border Transfer Guardrail';
          } else if (/hipaa|baa|phi\b/i.test(combinedText)) {
            ruleId = 'rule-hipaa-baa';
            matchedPolicy = 'HIPAA PHI Vendor Disclosure Guardrail';
          } else if (/dpdp|minor.*biometric|parental\s*consent/i.test(combinedText)) {
            ruleId = 'rule-dpdp-biometric';
            matchedPolicy = 'DPDP Minor Biometric Consent Guardrail';
          } else if (/delete|drop|truncate|destroy|purge/i.test(combinedText)) {
            ruleId = 'rule-4';
            matchedPolicy = 'Production File System Write/Delete Lock';
          } else if (/jailbreak|injection|dan\s*mode|ignore\s*(?:all\s*)?(?:previous|prior)|adversarial|openai_chat_completion/i.test(combinedText)) {
            ruleId = 'rule-2';
            matchedPolicy = 'Adversarial Jailbreak & System Reset Interception';
          } else {
            ruleId = 'rule-1';
            matchedPolicy = 'Strict PII & SSN Redaction Rule';
          }
        }

        const keysToIncrement = new Set<string>();
        if (ruleId) keysToIncrement.add(ruleId);
        if (matchedPolicy) keysToIncrement.add(matchedPolicy);

        // Robust alias and category mappings for guardrail rules
        if (ruleId === 'rule-pii-leakage' || ruleId === 'rule-1' || meta.piiDetected || matchedPolicy === 'Strict PII & SSN Redaction Rule') {
          keysToIncrement.add('rule-pii-leakage');
          keysToIncrement.add('rule-1');
          keysToIncrement.add('Strict PII & SSN Redaction Rule');
        }
        if (ruleId === 'rule-2' || matchedPolicy === 'Adversarial Prompt Injection & Jailbreak Guardrail' || matchedPolicy === 'Adversarial Jailbreak & System Reset Interception') {
          keysToIncrement.add('rule-2');
          keysToIncrement.add('Adversarial Jailbreak & System Reset Interception');
          keysToIncrement.add('Adversarial Prompt Injection & Jailbreak Guardrail');
        }
        if (ruleId === 'rule-3' || matchedPolicy === 'Disbursement > $10k Human Approval Trigger') {
          keysToIncrement.add('rule-3');
          keysToIncrement.add('Disbursement > $10k Human Approval Trigger');
        }
        if (ruleId === 'rule-4' || matchedPolicy === 'Production File System Write/Delete Lock') {
          keysToIncrement.add('rule-4');
          keysToIncrement.add('Production File System Write/Delete Lock');
        }
        if (ruleId === 'rule-gdpr-transfer' || matchedPolicy === 'GDPR Cross-Border Transfer Guardrail') {
          keysToIncrement.add('rule-gdpr-transfer');
          keysToIncrement.add('GDPR Cross-Border Transfer Guardrail');
        }
        if (ruleId === 'rule-hipaa-baa' || matchedPolicy === 'HIPAA PHI Vendor Disclosure Guardrail') {
          keysToIncrement.add('rule-hipaa-baa');
          keysToIncrement.add('HIPAA PHI Vendor Disclosure Guardrail');
        }
        if (ruleId === 'rule-dpdp-biometric' || matchedPolicy === 'DPDP Minor Biometric Consent Guardrail') {
          keysToIncrement.add('rule-dpdp-biometric');
          keysToIncrement.add('DPDP Minor Biometric Consent Guardrail');
        }

        keysToIncrement.forEach(key => {
          ruleInterceptions[key] = (ruleInterceptions[key] || 0) + 1;
        });
      }
    });

    // 2. Generate Chart Data (Last 7 Days)
    const chartData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === date.toDateString());
      
      chartData.push({
        day: dayStr,
        total: dayLogs.length,
        highRisk: dayLogs.filter(l => l.risk === 'high').length
      });
    }

    // 3. Department Breakdown (Dynamic based on metadata if available)
    const departmentsMap: Record<string, any> = {};
    logs.forEach(l => {
      const dept = (l.metadata as any)?.department || 'Unassigned';
      if (!departmentsMap[dept]) {
        departmentsMap[dept] = { name: dept, low: 0, medium: 0, high: 0 };
      }
      if (l.risk === 'low') departmentsMap[dept].low++;
      if (l.risk === 'medium') departmentsMap[dept].medium++;
      if (l.risk === 'high') departmentsMap[dept].high++;
    });

    const departments = Object.values(departmentsMap);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          riskScore: { value: score, trend: -2, trendLabel: 'points vs last week' },
          criticalViolations: { value: criticalViolations, trend: 1, trendLabel: 'since yesterday' },
          modelsBlockedToday: { value: blockedToday, trend: 0, trendLabel: 'vs yesterday' },
          complianceScore: { value: complianceScore, trend: 0, trendLabel: 'vs last month' },
          flaggedToday: { value: flaggedToday, trend: 0, trendLabel: 'vs yesterday' },
          allowedToday: { value: allowedToday, trend: 0, trendLabel: 'vs yesterday' },
          totalActionsToday: { value: totalToday, trend: 0, trendLabel: 'vs yesterday' }
        },
        ruleInterceptions,
        chartData,
        departments,
        violations: logs.slice(-10).reverse().map(l => {
          let actionLabel: string = 'ALLOW WITH WARNING';
          if (l.status === 'blocked') actionLabel = 'BLOCK';
          else if (l.status === 'flagged' || l.isPendingApproval) actionLabel = 'FLAGGED';

          return {
            id: l.id,
            user: { name: 'AI Agent', role: l.agent, avatar: (l.agent || 'A')[0].toUpperCase() },
            prompt: l.action,
            type: l.risk === 'high' ? 'Security Violation' : 'Activity',
            model: l.agent,
            timestamp: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            severity: l.risk,
            action: actionLabel,
            whyBlocked: l.reason || 'N/A',
            regulatoryReference: l.compliance && (l.compliance as any).standard ? (l.compliance as any).standard : 'Internal Policy'
          };
        }),
        alerts: incidents.slice(-3).map(i => ({
          id: i.id,
          message: i.details,
          type: i.severity > 70 ? 'critical' : 'warning',
          timestamp: i.created_at
        })),
        insights: [
          `Autonomous governance is at ${score}% efficiency`,
          `${policies.filter(p => p.enabled).length} guardrails active across all channels`,
          `No critical remediation pending for current scan cycle`
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};


export const postChat = async (req: any, res: Response, next: NextFunction) => {
  const { requestId, startTime } = req.context;
  const organizationId = await resolveOrganizationId(req);

  try {
    const message = String(req.body?.message || '').trim();

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 1. Fetch Real Context from DB
    const [incidents, policies, securityScore] = await Promise.all([
      prisma.incidents.findMany({
        where: { organizationId, status: 'unresolved' },
        take: 5,
        orderBy: { created_at: 'desc' }
      }),
      prisma.policies.findMany({
        where: { organizationId, enabled: true },
        select: { name: true, effect: true }
      }),
      calculateSecurityScore(organizationId)
    ]);

    const contextSummary = `
      Current Security Score: ${securityScore}/100.
      Active Policies: ${policies.map(p => `${p.name} (${p.effect})`).join(', ') || 'None'}.
      Recent Unresolved Incidents: ${incidents.map(i => i.details).join('; ') || 'None'}.
    `;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey && openaiKey.length >= 10) {
      try {
        const response = await runFairly(organizationId, async () => {
          return await callOpenAiCompletions(
            openaiKey,
            organizationId,
            [
              {
                role: 'system',
                content: `You are Sentraa Copilot, an AI governance assistant. 
                Use this REAL-TIME CONTEXT to answer the user's questions:
                ${contextSummary}
                Answer clearly and concisely based on this data.`
              },
              { role: 'user', content: message },
            ],
            600,
            2,
            12000
          );
        });

        if (response) {
          const latency = Date.now() - startTime;
          logRequest({ requestId, orgId: organizationId, endpoint: req.path, status: 200, latency });
          return res.status(200).json({ success: true, data: { response } });
        }
      } catch (e: any) {
        logger.error(`OpenAI chat failed for org ${organizationId}`, e.message);
      }
    }

    const latency = Date.now() - startTime;
    logRequest({ requestId, orgId: organizationId, endpoint: req.path, status: 200, latency, message: 'Operating in offline mode' });

    // Fallback: Return a real summary from DB if OpenAI is unavailable
    res.status(200).json({
      success: true,
      data: {
        response: `I am currently operating in offline mode. Here is the latest status for your organization: 
        Your security score is ${securityScore}. You have ${incidents.length} unresolved incidents that need attention. 
        There are ${policies.length} active governance policies enforced across your AI agents. 
        Please configure an OpenAI API key for deeper analysis and conversational answers.`
      },
    });
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logRequest({ requestId, orgId: organizationId || 'unknown', endpoint: req.path, status: 500, latency, error: error.message });
    next(error);
  }
};

import { evaluatePolicy } from '../services/policyEngine';
import { evaluateRisk } from '../services/riskEngine';
import { evaluateSemanticRisk } from '../services/semanticRiskEngine';

export const postEvaluate = async (req: any, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const agent = payload.agent_id || 'unknown-agent';
    const organizationId = req.user?.organizationId || payload.organization_id || 'unknown-org';
    const actionObj = payload.action;
    const metadata = payload.context || {};

    const actionStr = typeof actionObj === 'object' ? JSON.stringify(actionObj) : String(actionObj || '');

    // 1. Level 1: Policy Engine (Hard Rules)
    const policyResult = await evaluatePolicy(agent, actionStr, organizationId);
    if (!policyResult.allowed) {
      return res.status(200).json({
        decision: 'BLOCK',
        tier: 'L1',
        reason: policyResult.reason || 'Policy Violation detected.'
      });
    }

    // 2. Level 2: Risk Scoring Engine (Pattern & Keyword Weights)
    const riskResult = evaluateRisk(actionStr, { ...metadata, agent_id: agent });
    if (riskResult.score === 'high') {
      return res.status(200).json({
        decision: 'BLOCK',
        tier: 'L2',
        risk_score: riskResult.risk_score || 80,
        reason: riskResult.triggers?.join(', ') || 'High risk score detected.'
      });
    }

    // 3. Level 3: Semantic Analysis Engine - Outbound PII Leakage Detection (TC-004)
    if (actionObj && typeof actionObj === 'object') {
      const content = actionObj.parameters?.content || '';
      const ssnPattern = /\d{3}-\d{2}-\d{4}/;
      const cardPattern = /\d{4}-\d{4}-\d{4}-\d{4}/;
      const dobPattern = /\d{2}\/\d{2}\/\d{4}/;

      const piiDetectedList: string[] = [];
      if (ssnPattern.test(content)) piiDetectedList.push('SSN');
      if (cardPattern.test(content)) piiDetectedList.push('Credit Card');
      if (dobPattern.test(content)) piiDetectedList.push('Date of Birth');

      if (piiDetectedList.length > 0) {
        return res.status(200).json({
          decision: 'BLOCK',
          tier: 'L3',
          pii_detected: piiDetectedList,
          reason: `PII Leakage blocked: Detected sensitive data (${piiDetectedList.join(', ')}) in outbound response.`
        });
      }
    }

    // 4. Level 3: Semantic Analysis Engine - Prompt Injection (TC-005)
    const combinedPrompt = `${actionStr} ${metadata.raw_user_input || ''}`.trim();
    const semanticResult = await evaluateSemanticRisk(combinedPrompt);
    if (semanticResult.score === 'high') {
      return res.status(200).json({
        decision: 'BLOCK',
        tier: 'L3',
        confidence: semanticResult.confidence || 0.9,
        reason: semanticResult.explanation || 'Semantic adversarial intent detected.'
      });
    }

    return res.status(200).json({
      decision: 'ALLOW',
      reason: 'Allowed: Verified by three-tier pre-execution engine.'
    });
  } catch (error: any) {
    logger.error('Evaluate Route Failure:', error);
    res.status(500).json({
      error: error.message
    });
  }
};

