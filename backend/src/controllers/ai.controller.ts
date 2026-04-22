import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { logActivity, calculateSecurityScore } from '../services/policy.service';
import { io } from '../server';
import { checkActionSchema } from '../validations/ai.validation';
import { interceptAction } from '../middleware/interceptor';

export const postCheckAction = async (req: any, res: Response, next: NextFunction) => {
  const { requestId, startTime } = req.context;
  try {
    // 1. Validate Input
    const validated = checkActionSchema.parse(req.body);
    const { agent, action, metadata } = validated;

    const organizationId = await resolveOrganizationId(req);

    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Organization not identified', requestId });
    }

    // 2. Intercept and Execute
    const decision = await interceptAction(
      { agent, action, organizationId, metadata, requestId },
      async () => {
        // This is where the actual tool/action would be executed.
        // For the governance check, we often just want the decision.
        return { message: "Action authorized and simulated" };
      }
    );

    const latency = Date.now() - startTime;

    // 3. Push Real-time Update (dashboard)
    io.to(`company_${organizationId}`).emit('activity_log', { ...decision, organizationId, timestamp: new Date() });

    res.status(200).json({
      success: true,
      requestId,
      latency,
      data: decision
    });
  } catch (error) {
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
    
    let updateData: any = {
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

export const getLogs = async (req: any, res: Response, next: NextFunction) => {
  try {
    const organizationId = await resolveOrganizationId(req);
    if (!organizationId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const activityLogs = await prisma.logs.findMany({
      where: { organizationId: organizationId },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    res.status(200).json({
      success: true,
      data: activityLogs.map(log => ({
        ...log,
        agent_id: log.agent,
        risk_score: log.risk,
        created_at: log.timestamp
      }))
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
