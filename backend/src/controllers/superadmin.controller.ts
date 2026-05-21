import { Response } from 'express';
import prisma from '../config/db';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { FeatureFlagService } from '../services/featureFlag.service';
import { activityQueue, connectorQueue, driftQueue, retentionQueue } from '../services/queue.service';
import { parsePagination } from '../utils/pagination';
import { asyncHandler, sendSuccess, sendError } from '../utils/controllerHelpers';

// ── Tenant Management ─────────────────────────

export const getAllOrganizations = asyncHandler(async (req: any, res: Response) => {
  const { page, limit } = parsePagination(req.query, 20, 100);
  const search = req.query.search as string;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [orgs, total] = await Promise.all([
    prisma.organizations.findMany({
      where,
      select: {
        id: true, name: true, slug: true, is_active: true,
        plan: true, created_at: true, custom_domain: true,
        _count: { select: { users: true, ai_agents: true, incidents: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.organizations.count({ where }),
  ]);

  return sendSuccess(res, { success: true, data: orgs, total, page, limit });
});

export const getOrgDetail = asyncHandler(async (req: any, res: Response) => {
  const org = await prisma.organizations.findUnique({
    where: { id: req.params.orgId },
    include: {
      org_settings: true,
      workspaces: true,
      _count: { select: { users: true, ai_agents: true, incidents: true, policies: true } },
    },
  });
  if (!org) return sendError(res, 404, 'Organization not found');
  return sendSuccess(res, org);
});

export const suspendOrganization = asyncHandler(async (req: any, res: Response) => {
  const { orgId } = req.params;
  const { reason } = req.body;

  await prisma.organizations.update({
    where: { id: orgId },
    data: { is_active: false },
  });

  await prisma.platform_events.create({
    data: {
      organizationId: orgId,
      actor_id: req.user.id,
      event_type: 'TENANT_SUSPENDED',
      payload: { reason, suspendedAt: new Date().toISOString() },
    },
  });

  await auditLogger.log({
    organizationId: orgId,
    userId: req.user.id,
    action: 'TENANT_SUSPENDED',
    eventType: 'SECURITY',
    severity: 'critical',
    resourceType: 'organization',
    resourceId: orgId,
    metadata: { reason },
  });

  logger.warn(`[SuperAdmin] Org ${orgId} suspended by ${req.user.id}: ${reason}`);
  return sendSuccess(res, undefined, 200, 'Organization suspended');
});

export const reactivateOrganization = asyncHandler(async (req: any, res: Response) => {
  const { orgId } = req.params;
  await prisma.organizations.update({ where: { id: orgId }, data: { is_active: true } });

  await prisma.platform_events.create({
    data: {
      organizationId: orgId,
      actor_id: req.user.id,
      event_type: 'TENANT_REACTIVATED',
      payload: { reactivatedAt: new Date().toISOString() },
    },
  });

  return sendSuccess(res, undefined, 200, 'Organization reactivated');
});

// ── Queue & Worker Health ─────────────────────

export const getQueueStats = asyncHandler(async (req: any, res: Response) => {
  const queues = [
    { name: 'activity-logs', queue: activityQueue },
    { name: 'connector-scans', queue: connectorQueue },
    { name: 'drift-scans', queue: driftQueue },
    { name: 'data-retention', queue: retentionQueue },
  ];

  const stats = await Promise.all(
    queues.map(async ({ name, queue }) => {
      if (!queue) return { name, status: 'offline', counts: null };
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount().catch(() => 0),
        queue.getActiveCount().catch(() => 0),
        queue.getCompletedCount().catch(() => 0),
        queue.getFailedCount().catch(() => 0),
      ]);
      return { name, status: 'online', counts: { waiting, active, completed, failed } };
    })
  );

  return sendSuccess(res, stats);
});

// ── Feature Flags ─────────────────────────────

export const getFeatureFlags = asyncHandler(async (req: any, res: Response) => {
  const flags = await FeatureFlagService.listFlags();
  return sendSuccess(res, flags);
});

export const setFeatureFlag = asyncHandler(async (req: any, res: Response) => {
  const { key } = req.params;
  const { enabled } = req.body;
  const flag = await FeatureFlagService.setFlag(key, enabled);

  await auditLogger.log({
    organizationId: req.user.organizationId || 'platform',
    userId: req.user.id,
    action: 'FEATURE_FLAG_UPDATED',
    eventType: 'SYSTEM',
    severity: 'warn',
    metadata: { key, enabled },
  });

  return sendSuccess(res, flag);
});

export const setOrgFeatureFlag = asyncHandler(async (req: any, res: Response) => {
  const { orgId, key } = req.params;
  const { enabled } = req.body;
  const result = await FeatureFlagService.setOrgOverride(key, orgId, enabled);
  return sendSuccess(res, result);
});

// ── Platform Events ───────────────────────────

export const getPlatformEvents = asyncHandler(async (req: any, res: Response) => {
  const { page, limit } = parsePagination(req.query, 50, 200);
  const eventType = req.query.eventType as string;

  const where: any = {};
  if (eventType) where.event_type = eventType;

  const [events, total] = await Promise.all([
    prisma.platform_events.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { organization: { select: { name: true, slug: true } } },
    }),
    prisma.platform_events.count({ where }),
  ]);

  return sendSuccess(res, { success: true, data: events, total, page, limit });
});

// ── Global Statistics ─────────────────────────

export const getGlobalStats = asyncHandler(async (req: any, res: Response) => {
  const [
    totalOrgs, activeOrgs, totalUsers, totalAgents,
    totalIncidents, totalPolicies, totalEvals,
  ] = await Promise.all([
    prisma.organizations.count(),
    prisma.organizations.count({ where: { is_active: true } }),
    prisma.users.count(),
    prisma.ai_agents.count(),
    prisma.incidents.count(),
    prisma.policies.count({ where: { enabled: true } }),
    prisma.evaluation_runs.count(),
  ]);

  return sendSuccess(res, {
    organizations: { total: totalOrgs, active: activeOrgs, suspended: totalOrgs - activeOrgs },
    users: totalUsers,
    aiAgents: totalAgents,
    incidents: totalIncidents,
    activePolicies: totalPolicies,
    evaluationRuns: totalEvals,
    timestamp: new Date().toISOString(),
  });
});

// ── User Management ───────────────────────────

export const getAllUsers = asyncHandler(async (req: any, res: Response) => {
  const { search, organizationId } = req.query;
  const where: any = {};
  if (organizationId) where.organizationId = organizationId;
  if (search) {
    where.OR = [
      { email: { contains: search as string, mode: 'insensitive' } },
      { full_name: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.users.findMany({
    where,
    select: {
      id: true, email: true, full_name: true, role: true,
      is_active: true, created_at: true, last_login_at: true,
      mfa_enabled: true, email_verified: true,
      organizations: { select: { name: true, slug: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });

  return sendSuccess(res, users);
});

export const banUser = asyncHandler(async (req: any, res: Response) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await prisma.users.update({
    where: { id: userId },
    data: { is_active: false },
    select: { organizationId: true },
  });

  await prisma.platform_events.create({
    data: {
      organizationId: user.organizationId,
      actor_id: req.user.id,
      event_type: 'USER_BANNED',
      payload: { userId, reason },
    },
  });

  logger.warn(`[SuperAdmin] User ${userId} banned by ${req.user.id}`);
  return sendSuccess(res, undefined, 200, 'User banned');
});

