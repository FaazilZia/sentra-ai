import { Response, NextFunction } from 'express';
import prisma from '../config/db';
import logger from '../utils/logger';
import { getRedisClient } from '../config/redis';

// ─────────────────────────────────────────────
// Permission Matrix Definition
// ─────────────────────────────────────────────

export const ROLE_HIERARCHY = [
  'SUPER_ADMIN',
  'ADMIN',
  'COMPLIANCE_MANAGER',
  'SECURITY_ANALYST',
  'AUDITOR',
  'VIEWER',
  'SERVICE_AGENT',
] as const;

export type SentraRole = (typeof ROLE_HIERARCHY)[number];

export const PERMISSION_MATRIX: Record<SentraRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'policies:create', 'policies:read', 'policies:update', 'policies:delete',
    'incidents:create', 'incidents:read', 'incidents:update', 'incidents:resolve',
    'audit:read', 'audit:export',
    'users:create', 'users:read', 'users:update', 'users:delete',
    'workspaces:create', 'workspaces:read', 'workspaces:update', 'workspaces:delete',
    'evaluation:create', 'evaluation:read', 'evaluation:run',
    'agents:create', 'agents:read', 'agents:update', 'agents:delete',
    'settings:read', 'settings:update',
    'apikeys:create', 'apikeys:read', 'apikeys:delete',
    'compliance:read', 'compliance:update',
    'connectors:create', 'connectors:read', 'connectors:update', 'connectors:delete',
  ],
  COMPLIANCE_MANAGER: [
    'policies:read', 'policies:update',
    'incidents:read', 'incidents:resolve',
    'audit:read', 'audit:export',
    'users:read',
    'workspaces:read',
    'evaluation:read',
    'agents:read',
    'settings:read',
    'compliance:read', 'compliance:update',
    'connectors:read',
  ],
  SECURITY_ANALYST: [
    'policies:read',
    'incidents:read', 'incidents:resolve',
    'audit:read',
    'users:read',
    'workspaces:read',
    'evaluation:read', 'evaluation:run',
    'agents:read',
    'settings:read',
    'compliance:read',
    'connectors:read',
  ],
  AUDITOR: [
    'policies:read',
    'incidents:read',
    'audit:read', 'audit:export',
    'users:read',
    'workspaces:read',
    'evaluation:read',
    'agents:read',
    'compliance:read',
    'connectors:read',
  ],
  VIEWER: [
    'policies:read',
    'incidents:read',
    'agents:read',
    'compliance:read',
    'workspaces:read',
  ],
  SERVICE_AGENT: [
    'policies:read',
    'agents:read',
  ],
};

// ─────────────────────────────────────────────
// RBAC Service
// ─────────────────────────────────────────────

const PERM_CACHE_TTL = 300; // 5 minutes

export const RBACService = {
  /**
   * Check if a role has a specific permission.
   * Supports wildcard '*' for SUPER_ADMIN.
   */
  roleHasPermission(role: string, resource: string, action: string): boolean {
    const perms = PERMISSION_MATRIX[role as SentraRole] || [];
    if (perms.includes('*')) return true;
    return perms.includes(`${resource}:${action}`) || perms.includes(`${resource}:*`);
  },

  /**
   * Get all permissions for a user (from role + DB user_roles table).
   * Results are cached in Redis for 5 minutes.
   */
  async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    const redis = getRedisClient();
    const cacheKey = `rbac:perms:${userId}:${organizationId}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch { /* cache miss */ }
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true, user_roles: { include: { role: { include: { role_permissions: { include: { permission: true } } } } } } },
    });

    if (!user) return [];

    // Base permissions from role string
    const basePerms = PERMISSION_MATRIX[user.role as SentraRole] || [];

    // Additional permissions from user_roles join table
    const additionalPerms: string[] = [];
    for (const ur of user.user_roles) {
      if (ur.role?.role_permissions) {
        for (const rp of ur.role.role_permissions) {
          additionalPerms.push(`${rp.permission.resource}:${rp.permission.action}`);
        }
      }
    }

    const allPerms = [...new Set([...basePerms, ...additionalPerms])];

    if (redis) {
      await redis.set(cacheKey, JSON.stringify(allPerms), 'EX', PERM_CACHE_TTL).catch(() => {});
    }

    return allPerms;
  },

  async invalidatePermissionCache(userId: string, organizationId: string) {
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`rbac:perms:${userId}:${organizationId}`).catch(() => {});
    }
  },

  /**
   * Assign a role to a user within an org.
   */
  async assignRole(params: {
    userId: string;
    roleId: string;
    organizationId: string;
    assignedBy: string;
  }) {
    const result = await prisma.user_roles.upsert({
      where: {
        user_id_role_id_organizationId: {
          user_id: params.userId,
          role_id: params.roleId,
          organizationId: params.organizationId,
        },
      },
      create: {
        user_id: params.userId,
        role_id: params.roleId,
        organizationId: params.organizationId,
        assigned_by: params.assignedBy,
      },
      update: { assigned_by: params.assignedBy, updated_at: new Date() },
    });

    await this.invalidatePermissionCache(params.userId, params.organizationId);
    return result;
  },

  async revokeRole(userId: string, roleId: string, organizationId: string) {
    await prisma.user_roles.deleteMany({
      where: { user_id: userId, role_id: roleId, organizationId },
    });
    await this.invalidatePermissionCache(userId, organizationId);
  },

  async getUserRoles(userId: string, organizationId: string) {
    return prisma.user_roles.findMany({
      where: { user_id: userId, organizationId },
      include: { role: true },
    });
  },

  async listRoles() {
    return prisma.roles.findMany({
      include: { role_permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  },

  async createRole(name: string, description: string, permissionIds: string[]) {
    return prisma.roles.create({
      data: {
        name,
        description,
        is_system: false,
        role_permissions: {
          create: permissionIds.map((pid) => ({ permissionId: pid })),
        },
      },
      include: { role_permissions: { include: { permission: true } } },
    });
  },

  async seedSystemRoles() {
    const roles = [
      { name: 'SUPER_ADMIN', description: 'Platform-level super administrator', is_system: true },
      { name: 'ADMIN', description: 'Organization administrator', is_system: true },
      { name: 'COMPLIANCE_MANAGER', description: 'Manages compliance workflows and evidence', is_system: true },
      { name: 'SECURITY_ANALYST', description: 'Monitors security incidents and drift', is_system: true },
      { name: 'AUDITOR', description: 'Read-only access to audit logs and policies', is_system: true },
      { name: 'VIEWER', description: 'Basic read-only access', is_system: true },
    ];

    for (const role of roles) {
      await prisma.roles.upsert({
        where: { name: role.name },
        create: { name: role.name, description: role.description, is_system: role.is_system },
        update: { description: role.description },
      });
    }

    logger.info('[RBAC] System roles seeded');
  },
};

// ─────────────────────────────────────────────
// RBAC Middleware Guards
// ─────────────────────────────────────────────

/**
 * Fine-grained permission guard.
 * Usage: requirePermission('policies', 'create')
 */
export const requirePermission = (resource: string, action: string) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // SUPER_ADMIN bypass
    if (req.user.role === 'SUPER_ADMIN') return next();

    const hasPermission = RBACService.roleHasPermission(req.user.role, resource, action);
    if (hasPermission) return next();

    // Fallback: check user_roles table for additional permissions
    const perms = await RBACService.getUserPermissions(req.user.id, req.user.organizationId);
    const allowed = perms.includes('*') || perms.includes(`${resource}:${action}`);

    if (!allowed) {
      logger.warn(`[RBAC] Denied: user=${req.user.id} role=${req.user.role} needs ${resource}:${action}`);
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required: ${resource}:${action}`,
      });
    }

    next();
  };
};

/**
 * Role-based guard (backward compatible replacement for authorizeRoles).
 * Usage: requireRole('ADMIN', 'COMPLIANCE_MANAGER')
 */
export const requireRole = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized. Required: [${roles.join(', ')}]`,
      });
    }
    next();
  };
};

/**
 * Platform-level super admin guard.
 * Only SUPER_ADMIN role can pass.
 */
export const requireSuperAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }
  next();
};
