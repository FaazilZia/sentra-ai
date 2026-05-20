import prisma from '../config/db';
import { RBACService } from '../services/rbac.service';
import { FeatureFlagService } from '../services/featureFlag.service';
import logger from '../utils/logger';

/**
 * Enterprise seed script.
 * Safe to run multiple times (idempotent upserts throughout).
 * Run with: npx ts-node -r tsconfig-paths/register src/scripts/seed-enterprise.ts
 */
async function seedEnterprise() {
  logger.info('[Seed] Starting enterprise seed...');

  // 1. System Roles
  await RBACService.seedSystemRoles();

  // 2. Permissions registry
  const resources = ['policies', 'incidents', 'audit', 'users', 'workspaces', 'evaluation', 'agents', 'settings', 'apikeys', 'compliance', 'connectors', 'admin'];
  const actions = ['create', 'read', 'update', 'delete', 'export', 'approve', 'run', 'override'];

  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permissions.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action, description: `${action} ${resource}` },
        update: {},
      });
    }
  }
  logger.info('[Seed] Permissions registry seeded');

  // 3. Link system roles to permissions
  const allPerms = await prisma.permissions.findMany();
  const permMap = new Map(allPerms.map(p => [`${p.resource}:${p.action}`, p.id]));

  const ROLE_PERM_MAP: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    ADMIN: [
      'policies:create', 'policies:read', 'policies:update', 'policies:delete',
      'incidents:create', 'incidents:read', 'incidents:update',
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
      'incidents:read',
      'audit:read', 'audit:export',
      'users:read', 'workspaces:read',
      'evaluation:read', 'agents:read', 'settings:read',
      'compliance:read', 'compliance:update', 'connectors:read',
    ],
    SECURITY_ANALYST: [
      'policies:read', 'incidents:read',
      'audit:read', 'users:read', 'workspaces:read',
      'evaluation:read', 'evaluation:run',
      'agents:read', 'settings:read', 'compliance:read', 'connectors:read',
    ],
    AUDITOR: [
      'policies:read', 'incidents:read',
      'audit:read', 'audit:export',
      'users:read', 'workspaces:read',
      'evaluation:read', 'agents:read', 'compliance:read', 'connectors:read',
    ],
    VIEWER: ['policies:read', 'incidents:read', 'agents:read', 'compliance:read', 'workspaces:read'],
  };

  for (const [roleName, perms] of Object.entries(ROLE_PERM_MAP)) {
    const role = await prisma.roles.findUnique({ where: { name: roleName } });
    if (!role) continue;

    const permKeys = perms[0] === '*'
      ? allPerms.map(p => `${p.resource}:${p.action}`)
      : perms;

    for (const key of permKeys) {
      const permId = permMap.get(key);
      if (!permId) continue;
      await prisma.role_permissions.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        create: { roleId: role.id, permissionId: permId },
        update: {},
      });
    }
  }
  logger.info('[Seed] Role-permission links seeded');

  // 4. Feature flags
  await FeatureFlagService.seedDefaultFlags();

  logger.info('[Seed] Enterprise seed completed successfully ✅');
}

seedEnterprise()
  .catch((e) => { logger.error('[Seed] Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
