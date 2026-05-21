import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { enqueueConnectorScan } from '../services/queue.service';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

export const listConnectors = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendSuccess(res, { items: [] });
  }

  const rows = await prisma.connectors.findMany({
    where: { organizationId },
    orderBy: { created_at: 'desc' },
  });

  return sendSuccess(res, { items: rows });
});

export const getExecutiveOverview = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const connectors = await prisma.connectors.findMany({
    where: { organizationId }
  });

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const [totalLogsCount, blockedLogsCount, activePoliciesCount, totalPoliciesCount] = await Promise.all([
    prisma.logs.count({ where: { organizationId, timestamp: { gte: last24h } } }),
    prisma.logs.count({ where: { organizationId, timestamp: { gte: last24h }, status: 'blocked' } }),
    prisma.policies.count({ where: { organizationId, enabled: true } }),
    prisma.policies.count({ where: { organizationId } })
  ]);

  const totalBudgetUsed = connectors.reduce((acc, c) => acc + (c.daily_cost_total || 0), 0);
  const totalDailyLimit = connectors.length > 0 
    ? connectors.reduce((acc, c) => acc + ((c.scan_policy as any)?.maxDailyCost || 5.0), 0)
    : 100.0;
  
  const scansLast24h = totalLogsCount;
  const activeConnectors = connectors.filter(c => c.status === 'active' || c.status === 'active_partial').length;
  
  const policyCoverage = totalPoliciesCount > 0 
    ? Math.round((activePoliciesCount / totalPoliciesCount) * 100) 
    : 100;

  const avgHealth = policyCoverage;

  let systemMode = 'autonomous';
  if (connectors.some(c => c.status === 'paused_budget')) systemMode = 'restricted';
  if (connectors.some(c => c.priority === 'high')) systemMode = 'high_alert';

  return sendSuccess(res, {
    systemMode,
    auditSummary: {
      scansLast24h,
      violationsDetected: blockedLogsCount,
      budgetUsed: totalBudgetUsed,
      budgetLimit: totalDailyLimit,
      activeConnectors,
      healthScore: avgHealth
    },
    controls: {
      scanningMode: 'auto',
      authority: req.user?.role === 'ADMIN' ? 'full' : 'limited'
    }
  });
});

export const createConnector = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { name, type, config, scope } = req.body as {
    name: string;
    type: 'sql' | 'gdrive' | 's3' | 'local';
    config?: Record<string, unknown>;
    scope?: Record<string, unknown>;
  };

  const row = await prisma.connectors.create({
    data: {
      id: crypto.randomUUID(),
      organizationId,
      name,
      type,
      config: (config || {}) as object,
      scope: (scope || {}) as object,
      status: 'pending',
      last_scan_at: null,
    },
  });

  await enqueueConnectorScan(type, row.id);

  return sendSuccess(res, row, 201);
});
