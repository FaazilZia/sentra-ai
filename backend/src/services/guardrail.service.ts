import prisma from '../config/db';
import logger from '../utils/logger';
import { evaluateRisk } from './riskEngine';
import { evaluateSemanticRisk } from './semanticRiskEngine';
import { DriftService } from './drift.service';

export interface GuardrailDecision {
  decision: 'ALLOW' | 'MODIFY' | 'BLOCK';
  confidence: 'High' | 'Medium' | 'Low';
  reason?: string;
  policy_triggered?: string;
  processedText: string;
}

// Actions that are always considered safe regardless of other signals.
// These will short-circuit the evaluation and return ALLOW immediately.
const SAFE_ACTION_ALLOWLIST = [
  'fetch_weather', 'get_weather', 'weather',
  'fetch_time', 'get_time', 'timezone',
  'health_check', 'ping', 'status',
  'read_config', 'get_config',
  'list_items', 'fetch_list', 'get_list',
  'search', 'lookup', 'find',
  'translate', 'summarize', 'format',
  'calculate', 'compute',
  'log_event', 'track_event',
];

// Regex patterns that unambiguously signal adversarial intent.
// The semantic engine is only triggered when one of these is present.
const ADVERSARIAL_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /override\s+(system|safety|rules)/i,
  /jailbreak/i,
  /bypass\s+(security|auth|filter)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /reveal\s+(your\s+)?(system\s+prompt|secrets?|instructions)/i,
  /dan\s+mode/i,
  /debug\s+mode/i,
];

const POLICIES = [
  {
    id: 'NO_PII_EXPOSURE',
    patterns: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone (simple)
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    ],
    action: 'MODIFY', // Redact by default, can be BLOCK
    description: 'Masks or blocks personal identifiable information'
  },
  {
    id: 'NO_PHI_EXPOSURE',
    patterns: [
      /\b(medical|patient|diagnosis|treatment|prescription)\b/gi,
      /\b\d{10,}\b/g, // Potential medical record IDs
    ],
    action: 'BLOCK',
    description: 'Blocks health insurance and patient records'
  },
  {
    id: 'PROMPT_INJECTION_DETECT',
    patterns: [
      /ignore previous instructions/gi,
      /system prompt/gi,
      /reveal secret/gi
    ],
    action: 'BLOCK',
    description: 'Detects and blocks prompt injection attempts'
  }
];


export class GuardrailService {
  static async evaluateInput(text: string): Promise<GuardrailDecision> {
    let decision: 'ALLOW' | 'MODIFY' | 'BLOCK' = 'ALLOW';
    let confidence: 'High' | 'Medium' | 'Low' = 'High';
    let reason = 'No risk patterns detected';
    let policy_triggered: string | undefined = undefined;
    let processedText = text;

    // 0. Safe-Action Allowlist: Short-circuit for known-benign actions.
    // These are legitimate actions that should never be blocked by default.
    const normalizedText = text.toLowerCase();
    const isSafeAction = SAFE_ACTION_ALLOWLIST.some(safe => normalizedText.includes(safe));
    if (isSafeAction) {
      return {
        decision: 'ALLOW',
        confidence: 'High',
        reason: 'No risk patterns detected',
        policy_triggered: undefined,
        processedText: text
      };
    }

    // 1. Traditional Regex/Pattern Matching (Fast path)
    for (const policy of POLICIES) {
      for (const pattern of policy.patterns) {
        pattern.lastIndex = 0; // Reset global state for reliable testing
        if (pattern.test(text)) {
          confidence = pattern.toString().includes('\\b') ? 'Medium' : 'High';

          if (policy.action === 'BLOCK') {
            return {
              decision: 'BLOCK',
              confidence,
              reason: `Action blocked: potentially sensitive data or restricted pattern detected`,
              policy_triggered: policy.id,
              processedText: '[BLOCKED BY GOVERNANCE ENGINE]'
            };
          } else if (policy.action === 'MODIFY') {
            decision = 'MODIFY';
            policy_triggered = policy.id;
            reason = `Action modified: sensitive data masked for safety`;
            processedText = processedText.replace(pattern, (match) => {
              return match[0] + '***' + (match.includes('@') ? match.split('@')[1] : '');
            });
          }
        }
      }
    }

    // 2. Hardened Risk Engine
    const engineResult = evaluateRisk('ai_proxy', { prompt: text });
    if (engineResult.score === 'high') {
      return {
        decision: 'BLOCK',
        confidence: 'High',
        reason: `Action blocked: high-risk behavior pattern identified`,
        policy_triggered: 'RISK_ADAPTIVE_CONTROL',
        processedText: '[BLOCKED BY SECURITY ENGINE]'
      };
    }

    // 3. Semantic Analysis — only run when confirmed adversarial pattern detected.
    // Running on all inputs caused false positives for generic structured actions.
    const hasAdversarialPattern = ADVERSARIAL_PATTERNS.some(p => p.test(text));
    if (hasAdversarialPattern) {
      const semanticResult = await evaluateSemanticRisk(text);
      if (semanticResult.score === 'high') {
        return {
          decision: 'BLOCK',
          confidence: 'High',
          reason: `Action blocked: adversarial intent detected`,
          policy_triggered: 'SEMANTIC_ADVERSARIAL_DETECT',
          processedText: '[BLOCKED BY SEMANTIC GUARDRAIL]'
        };
      }
    }

    return { decision, confidence, reason, policy_triggered, processedText };
  }

  static async evaluateOutput(text: string): Promise<GuardrailDecision> {
    // Same logic as input for now, but usually more strict on leakage
    return await this.evaluateInput(text);
  }

  static async logInterception(data: {
    user_id: string;
    organizationId: string;
    input_text: string;
    output_text?: string;
    decision: string;
    confidence?: string;
    reason?: string;
    policy_triggered?: string;
    metadata?: any;
  }) {
    try {
      const log = await prisma.interception_logs.create({
        data: {
          user_id: data.user_id,
          organizationId: data.organizationId,
          input_text: data.input_text,
          output_text: data.output_text,
          decision: data.decision,
          confidence: data.confidence || 'High',
          reason: data.reason,
          policy_triggered: data.policy_triggered,
          metadata: { 
            ...data.metadata,
            categories: data.policy_triggered ? [data.policy_triggered] : (data.metadata?.categories || [])
          }
        }
      });

      // Background Drift Check (Fire and forget)
      DriftService.checkAgentDrift(data.organizationId, data.user_id).catch(err => {
        logger.error('Background drift check failed:', err);
      });

      return log;
    } catch (err) {
      logger.error('Failed to log interception:', err);
    }
  }

  static async requestOverride(logId: string, userId: string, reason: string) {
    await prisma.interception_logs.update({
      where: { id: logId },
      data: { override_status: 'pending' }
    });

    return await prisma.guardrail_overrides.create({
      data: { log_id: logId, requested_by: userId, reason, status: 'pending' }
    });
  }

  static async approveOverride(overrideId: string, adminId: string, status: 'approved' | 'rejected') {
    const override = await prisma.guardrail_overrides.update({
      where: { id: overrideId },
      data: { status, approved_by: adminId }
    });

    await prisma.interception_logs.update({
      where: { id: override.log_id },
      data: { override_status: status }
    });

    return override;
  }

  static async getOverrides(organizationId: string) {
    return await prisma.guardrail_overrides.findMany({
      where: { interception_log: { organizationId } },
      orderBy: { timestamp: 'desc' }
    });
  }

  static async getMetrics(organizationId: string) {
    const logs = await prisma.interception_logs.findMany({
      where: { organizationId }
    });
    const total = logs.length;
    if (total === 0) return { total: 0, allowed: 100, blocked: 0, modified: 0 };

    const allowed = (logs.filter((l: any) => l.decision === 'ALLOW').length / total) * 100;
    const blocked = (logs.filter((l: any) => l.decision === 'BLOCK').length / total) * 100;
    const modified = (logs.filter((l: any) => l.decision === 'MODIFY').length / total) * 100;

    return { total, allowed, blocked, modified };
  }


  static async getInterceptionLogs(
    page: number = 1,
    limit: number = 20,
    filters: {
      organizationId: string;
      startDate?: string;
      endDate?: string;
      decision?: string;
    }
  ) {
    const where: any = { organizationId: filters.organizationId };
    if (filters.decision) where.decision = filters.decision;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.interception_logs.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.interception_logs.count({ where })
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
