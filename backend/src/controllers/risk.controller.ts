import { Response } from 'express';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const getRiskAssessment = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const [logs, incidents, agents] = await Promise.all([
    prisma.logs.findMany({
      where: { organizationId, timestamp: { gte: last30Days } },
      orderBy: { timestamp: 'desc' }
    }),
    prisma.incidents.findMany({
      where: { organizationId, created_at: { gte: last30Days } }
    }),
    prisma.ai_agents.findMany({
      where: { organizationId }
    })
  ]);

  // 1. Calculate Risk Posture
  const highRiskAttempts = logs.filter(l => l.risk === 'high').length;
  const highRiskBlocked = logs.filter(l => l.risk === 'high' && l.status === 'blocked').length;
  
  // Efficiency: How well are we blocking high risk?
  const efficiency = highRiskAttempts > 0 ? Math.round((highRiskBlocked / highRiskAttempts) * 100) : 100;
  
  // 2. Heatmap Data (Simulated by day of week from real logs)
  const heatmap = [0, 1, 2, 3, 4, 5, 6].map(day => {
    return logs.filter(l => new Date(l.timestamp).getDay() === day).length;
  });

  // 3. Exposure Data
  const exposure = {
    pii: logs.filter(l => l.action.includes('pii') || l.reason?.includes('PII')).length,
    credentials: logs.filter(l => l.action.includes('password') || l.action.includes('secret')).length,
    compliance: incidents.length,
    overall: Math.max(0, 100 - (incidents.length * 5) - (highRiskAttempts - highRiskBlocked) * 10)
  };

  return sendSuccess(res, {
    posture: {
      score: exposure.overall,
      efficiency,
      totalEvents: logs.length,
      criticalAlerts: incidents.filter(i => i.severity > 80).length
    },
    heatmap,
    exposure,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      risk: logs.filter(l => l.agent === a.name && l.risk === 'high').length > 5 ? 'High' : 'Low',
      events: logs.filter(l => l.agent === a.name).length
    }))
  });
});

