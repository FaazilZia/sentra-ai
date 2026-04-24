import { Response, NextFunction } from 'express'; // Refreshing TS Server Context
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

    // 3. Optional: Generate AI Summary for allowed actions
    let ai_summary: string | undefined = undefined;
    if (decision.status === 'allowed') {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey && openaiKey !== 'sk-placeholder') {
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
                  content: 'You are a governance assistant. In one sentence, explain why this AI action was allowed or blocked.'
                },
                { 
                  role: 'user', 
                  content: `Action: ${action}, Agent: ${agent}, Decision: ALLOWED. Context: ${JSON.stringify(metadata)}` 
                },
              ],
              max_tokens: 100,
            }),
          });

          if (r.ok) {
            const data = (await r.json()) as any;
            ai_summary = data.choices?.[0]?.message?.content?.trim();
          }
        } catch (e) {
          logger.warn('OpenAI summary generation failed', e);
        }
      }
    }

    // 4. Push Real-time Update (dashboard)
    io.to(`company_${organizationId}`).emit('activity_log', { 
      ...decision, 
      organizationId, 
      timestamp: new Date(),
      ai_summary 
    });

    res.status(200).json({
      success: true,
      requestId,
      latency,
      data: {
        ...decision,
        ai_summary
      }
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

    // 1. Calculate KPIs
    const criticalViolations = incidents.filter(i => i.severity > 70).length;
    const blockedToday = logs.filter(l => l.status === 'blocked' && new Date(l.timestamp).toDateString() === new Date().toDateString()).length;
    const complianceScore = policies.length > 0 ? Math.round((policies.filter(p => p.enabled).length / policies.length) * 100) : 100;

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
          complianceScore: { value: complianceScore, trend: 0, trendLabel: 'vs last month' }
        },
        chartData,
        departments,
        violations: logs.slice(-10).reverse().map(l => {
          let actionLabel: string = 'ALLOW WITH WARNING';
          if (l.status === 'blocked') actionLabel = 'BLOCK';
          if (l.isPendingApproval) actionLabel = 'REQUIRE REVIEW';

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
  try {
    const message = String(req.body?.message || '').trim();
    const organizationId = await resolveOrganizationId(req);

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
                content: `You are Sentra Copilot, an AI governance assistant. 
                Use this REAL-TIME CONTEXT to answer the user's questions:
                ${contextSummary}
                Answer clearly and concisely based on this data.`
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
        }
      } catch (e) {
        logger.warn('OpenAI chat request failed', e);
      }
    }

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
  } catch (error) {
    next(error);
  }
};
