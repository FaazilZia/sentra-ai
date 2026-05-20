import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import logger from '../utils/logger';
import { auditLogger } from '../utils/auditLogger';
import { FeatureFlagService } from '../services/featureFlag.service';
import { activityQueue, connectorQueue, driftQueue, retentionQueue } from '../services/queue.service';

// ── Tenant Management ─────────────────────────

export const getAllOrganizations = async (req: any, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
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

    res.json({ success: true, data: orgs, total, page, limit });
  } catch (e) { next(e); }
};

export const getOrgDetail = async (req: any, res: Response, next: NextFunction) => {
  try {
    const org = await prisma.organizations.findUnique({
      where: { id: req.params.orgId },
      include: {
        org_settings: true,
        workspaces: true,
        _count: { select: { users: true, ai_agents: true, incidents: true, policies: true } },
      },
    });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    res.json({ success: true, data: org });
  } catch (e) { next(e); }
};

export const suspendOrganization = async (req: any, res: Response, next: NextFunction) => {
  try {
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
    res.json({ success: true, message: 'Organization suspended' });
  } catch (e) { next(e); }
};

export const reactivateOrganization = async (req: any, res: Response, next: NextFunction) => {
  try {
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

    res.json({ success: true, message: 'Organization reactivated' });
  } catch (e) { next(e); }
};

// ── Queue & Worker Health ─────────────────────

export const getQueueStats = async (req: any, res: Response, next: NextFunction) => {
  try {
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

    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
};

// ── Feature Flags ─────────────────────────────

export const getFeatureFlags = async (req: any, res: Response, next: NextFunction) => {
  try {
    const flags = await FeatureFlagService.listFlags();
    res.json({ success: true, data: flags });
  } catch (e) { next(e); }
};

export const setFeatureFlag = async (req: any, res: Response, next: NextFunction) => {
  try {
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

    res.json({ success: true, data: flag });
  } catch (e) { next(e); }
};

export const setOrgFeatureFlag = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { orgId, key } = req.params;
    const { enabled } = req.body;
    const result = await FeatureFlagService.setOrgOverride(key, orgId, enabled);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

// ── Platform Events ───────────────────────────

export const getPlatformEvents = async (req: any, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
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

    res.json({ success: true, data: events, total, page, limit });
  } catch (e) { next(e); }
};

// ── Global Statistics ─────────────────────────

export const getGlobalStats = async (req: any, res: Response, next: NextFunction) => {
  try {
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

    res.json({
      success: true,
      data: {
        organizations: { total: totalOrgs, active: activeOrgs, suspended: totalOrgs - activeOrgs },
        users: totalUsers,
        aiAgents: totalAgents,
        incidents: totalIncidents,
        activePolicies: totalPolicies,
        evaluationRuns: totalEvals,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) { next(e); }
};

// ── User Management ───────────────────────────

export const getAllUsers = async (req: any, res: Response, next: NextFunction) => {
  try {
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

    res.json({ success: true, data: users });
  } catch (e) { next(e); }
};

export const banUser = async (req: any, res: Response, next: NextFunction) => {
  try {
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
    res.json({ success: true, message: 'User banned' });
  } catch (e) { next(e); }
};
