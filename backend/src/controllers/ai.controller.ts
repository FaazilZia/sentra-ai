import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import prisma from '../config/db';
import { resolveTenantId } from '../utils/tenant';
import { checkPermission, logActivity, CheckPermissionResult, calculateSecurityScore } from '../services/policy.service';
import { io } from '../server';
import { checkActionSchema } from '../validations/ai.validation';

export const postCheckAction = async (req: any, res: Response, next: NextFunction) => {
  const { requestId, startTime } = req.context;
  try {
    // 1. Validate Input
    const validated = checkActionSchema.parse(req.body);
    const { agent, action, metadata } = validated;

    const tenantId = await resolveTenantId(req);

    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Tenant not identified', requestId });
    }

    // 2. Execute Governance Decision
    const decision: CheckPermissionResult = await checkPermission(agent, action, tenantId, metadata);
    const latencyMs = Date.now() - startTime;

    // 3. Log Activity (with correlation ID and latency)
    const log = await logActivity({
      tenantId,
      agentId: agent,
      action,
      status: decision.status,
      riskScore: decision.risk_score,
      reason: decision.reason,
      impact: decision.impact,
      compliance: decision.compliance,
      metadata,
      requestId,
      latencyMs
    });

    // 4. Push Real-time Update
    io.emit('activity_log', log);

    res.status(200).json({
      success: true,
      requestId,
      latencyMs,
      data: {
        status: decision.status,
        risk_score: decision.risk_score,
        reason: decision.reason,
        impact: decision.impact,
        compliance: decision.compliance,
        explanation: decision.explanation,
        confidence: decision.confidence,
        timeline: decision.timeline
      }
    });
  } catch (error) {
    next(error);
  }
};

export const postReplayAction = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { logId } = req.body;
    const tenantId = await resolveTenantId(req);

    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const originalLog = await prisma.ai_activity_logs.findUnique({
      where: { id: logId }
    });

    if (!originalLog || originalLog.tenant_id !== tenantId) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    const decision = await checkPermission(originalLog.agent_id, originalLog.action, tenantId, originalLog.metadata);

    // We don't necessarily need to create a NEW log for a replay, 
    // but we return the decision as if it just happened.
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
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const score = await calculateSecurityScore(tenantId);
    res.status(200).json({ success: true, data: { score } });
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const logs = await prisma.ai_activity_logs.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 100
    });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

export const postChat = async (req: any, res: Response, next: NextFunction) => {
  try {
    const message = String(req.body?.message || '').trim();

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  'You are Sentra Copilot, an assistant for AI governance, compliance, and security operations. Answer clearly and concisely.',
              },
              { role: 'user', content: message },
            ],
            max_tokens: 600,
          }),
        });

        if (r.ok) {
          const data = (await r.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          if (text) {
            return res.status(200).json({ success: true, data: { response: text } });
          }
        } else {
          const errText = await r.text();
          logger.warn('OpenAI chat non-OK response', { status: r.status, errText });
        }
      } catch (e) {
        logger.warn('OpenAI chat request failed', e);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        response:
          'I can help with incidents, policies, and consent workflows. This environment is running without OPENAI_API_KEY, so replies are limited. Configure OPENAI_API_KEY on the server for full Copilot answers. In the meantime, check the Security Feed for unresolved incidents and the Governance page for active policies.',
      },
    });
  } catch (error) {
    next(error);
  }
};
