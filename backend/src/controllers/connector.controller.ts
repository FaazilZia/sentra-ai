import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/db';
import { resolveOrganizationId } from '../utils/company';
import { enqueueConnectorScan } from '../services/queue.service';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';
import {
  encryptCredentials,
  sanitizeConnector,
  parseServiceAccountInput,
  normalizePrivateKey,
} from '../utils/credentialHelper';
import { parseCursorPagination } from '../utils/pagination';
import { testConnectorSource } from '../services/connectorTest.service';
import { assertSafeTarget } from '../utils/ssrfProtection';

export const listConnectors = asyncHandler(async (req: any, res: Response) => {
  let limit: number;
  let cursor: string | undefined;

  try {
    const parsed = parseCursorPagination(req.query);
    limit = parsed.limit;
    cursor = parsed.cursor;
  } catch (err: any) {
    return sendError(res, 400, err.message);
  }

  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendSuccess(res, { data: [], items: [], nextCursor: null, total: 0 });
  }

  const total = await prisma.connectors.count({
    where: { organizationId },
  });

  const rows = await prisma.connectors.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    where: { organizationId },
    orderBy: { created_at: 'desc' },
  });

  const hasMore = rows.length > limit;
  const rawData = hasMore ? rows.slice(0, -1) : rows;
  const data = rawData.map(r => sanitizeConnector(r));
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return sendSuccess(res, { data, items: data, nextCursor, total });
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

export const testConnector = asyncHandler(async (req: any, res: Response) => {
  const { type, config, credentials } = req.body as {
    type: string;
    config?: Record<string, any>;
    credentials?: any;
  };

  const result = await testConnectorSource(type, config, credentials);
  if (!result.success) {
    return sendError(res, 400, result.message);
  }

  return sendSuccess(res, result);
});

export const createConnector = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) {
    return sendError(res, 400, 'Company context required');
  }

  const { name, type, config, credentials, scope } = req.body as {
    name: string;
    type: 'postgres' | 'sql' | 'gdrive' | 's3';
    config?: Record<string, unknown>;
    credentials?: Record<string, unknown> | string;
    scope?: Record<string, unknown>;
  };

  let rawCreds: any = credentials || (config && (config as any).credentials);

  // Normalization for Google Drive service account
  if (type === 'gdrive' && rawCreds) {
    const parsed = parseServiceAccountInput(rawCreds);
    rawCreds = {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      driveScope: parsed.driveScope || (config as any)?.driveScope,
    };
  }

  // SSRF check for PostgreSQL targets
  if ((type === 'postgres' || type === 'sql') && rawCreds) {
    const host = rawCreds.host || (config as any)?.host;
    if (host) {
      await assertSafeTarget(host);
    }
  }

  // Encrypt credentials before storing
  let encryptedCredentials: string | null = null;
  if (rawCreds) {
    encryptedCredentials = encryptCredentials(rawCreds);
  }

  // Clean raw secrets out of config
  const cleanConfig: Record<string, unknown> = config ? { ...config } : {};
  delete cleanConfig.credentials;
  delete cleanConfig.secretAccessKey;
  delete cleanConfig.password;
  delete cleanConfig.private_key;
  delete cleanConfig.privateKey;

  const row = await prisma.connectors.create({
    data: {
      id: crypto.randomUUID(),
      organizationId,
      name,
      type,
      config: cleanConfig as object,
      credentials: encryptedCredentials,
      scope: (scope || {}) as object,
      status: 'pending',
      last_scan_at: null,
      last_error: null,
    },
  });

  await enqueueConnectorScan(type, row.id);

  return sendSuccess(res, sanitizeConnector(row), 201);
});

export const triggerConnectorScan = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { id } = req.params;
  const existing = await prisma.connectors.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return sendError(res, 404, 'Connector not found');
  }

  await enqueueConnectorScan(existing.type, existing.id, { reason: 'manual' });
  return sendSuccess(res, { message: 'Connector scan queued successfully' });
});

export const deleteConnector = asyncHandler(async (req: any, res: Response) => {
  const organizationId = await resolveOrganizationId(req);
  if (!organizationId) return sendError(res, 401, 'Unauthorized');

  const { id } = req.params;
  const existing = await prisma.connectors.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return sendError(res, 404, 'Connector not found');
  }

  await prisma.connectors.delete({ where: { id } });
  return sendSuccess(res, null, 200, 'Connector deleted successfully');
});
