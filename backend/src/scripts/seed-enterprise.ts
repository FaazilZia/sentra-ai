import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Enterprise seed script — standalone, no lazy-init dependency.
 * Idempotent (upsert throughout). Safe to run multiple times.
 * Run: npm run seed:enterprise
 */

async function seedEnterprise() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  console.log('\n============================================================');
  console.log('  SENTRAA AI v2.0.0 — ENTERPRISE SEED');
  console.log('============================================================\n');

  // ── 1. System Roles ───────────────────────────────────────
  console.log('[ 1/4 ] Seeding system roles...');
  const SYSTEM_ROLES = [
    { name: 'SUPER_ADMIN',        description: 'Platform-wide superuser with unrestricted access',   is_system: true },
    { name: 'ADMIN',              description: 'Organization administrator with full org access',       is_system: true },
    { name: 'COMPLIANCE_MANAGER', description: 'Manages compliance policies, audits, and workflows',   is_system: true },
    { name: 'SECURITY_ANALYST',   description: 'Security monitoring, risk assessment, evaluations',    is_system: true },
    { name: 'AUDITOR',            description: 'Read-only access to audit logs and compliance data',    is_system: true },
    { name: 'VIEWER',             description: 'Read-only access to non-sensitive data',               is_system: true },
    { name: 'SERVICE_AGENT',      description: 'Machine-to-machine service account role',              is_system: true },
  ];

  for (const role of SYSTEM_ROLES) {
    await prisma.roles.upsert({
      where: { name: role.name },
      create: { ...role },
      update: { description: role.description },
    });
    console.log(`  ✅ ${role.name}`);
  }

  // ── 2. Permissions Registry ───────────────────────────────
  console.log('\n[ 2/4 ] Seeding permissions registry...');
  const resources = ['policies','incidents','audit','users','workspaces','evaluation','agents','settings','apikeys','compliance','connectors','admin'];
  const actions   = ['create','read','update','delete','export','approve','run','override'];
  let permCount = 0;
  for (const resource of resources) {
    for (const action of actions) {
      await prisma.permissions.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action, description: `${action} ${resource}` },
        update: {},
      });
      permCount++;
    }
  }
  console.log(`  ✅ ${permCount} permissions registered (${resources.length} resources × ${actions.length} actions)`);

  // ── 3. Role-Permission Matrix ─────────────────────────────
  console.log('\n[ 3/4 ] Seeding role-permission links...');
  const allPerms = await prisma.permissions.findMany();
  const permMap  = new Map(allPerms.map(p => [`${p.resource}:${p.action}`, p.id]));

  const ROLE_PERM_MAP: Record<string, string[]> = {
    SUPER_ADMIN: ['*'],
    ADMIN: [
      'policies:create','policies:read','policies:update','policies:delete',
      'incidents:create','incidents:read','incidents:update',
      'audit:read','audit:export',
      'users:create','users:read','users:update','users:delete',
      'workspaces:create','workspaces:read','workspaces:update','workspaces:delete',
      'evaluation:create','evaluation:read','evaluation:run',
      'agents:create','agents:read','agents:update','agents:delete',
      'settings:read','settings:update',
      'apikeys:create','apikeys:read','apikeys:delete',
      'compliance:read','compliance:update',
      'connectors:create','connectors:read','connectors:update','connectors:delete',
    ],
    COMPLIANCE_MANAGER: [
      'policies:read','policies:update','incidents:read',
      'audit:read','audit:export','users:read','workspaces:read',
      'evaluation:read','agents:read','settings:read',
      'compliance:read','compliance:update','connectors:read',
    ],
    SECURITY_ANALYST: [
      'policies:read','incidents:read','audit:read','users:read','workspaces:read',
      'evaluation:read','evaluation:run','agents:read','settings:read','compliance:read','connectors:read',
    ],
    AUDITOR: [
      'policies:read','incidents:read','audit:read','audit:export',
      'users:read','workspaces:read','evaluation:read','agents:read','compliance:read','connectors:read',
    ],
    VIEWER: ['policies:read','incidents:read','agents:read','compliance:read','workspaces:read'],
    SERVICE_AGENT: ['evaluation:run','agents:read','policies:read'],
  };

  let linkCount = 0;
  for (const [roleName, perms] of Object.entries(ROLE_PERM_MAP)) {
    const role = await prisma.roles.findUnique({ where: { name: roleName } });
    if (!role) { console.log(`  ⚠️  Role not found: ${roleName}`); continue; }
    const permKeys = perms[0] === '*' ? allPerms.map(p => `${p.resource}:${p.action}`) : perms;
    for (const key of permKeys) {
      const permId = permMap.get(key);
      if (!permId) continue;
      await prisma.role_permissions.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        create: { roleId: role.id, permissionId: permId },
        update: {},
      });
      linkCount++;
    }
    console.log(`  ✅ ${roleName}: ${permKeys.length} permissions linked`);
  }
  console.log(`  Total: ${linkCount} role-permission links`);

  // ── 4. Feature Flags ──────────────────────────────────────
  console.log('\n[ 4/4 ] Seeding feature flags...');
  const DEFAULT_FLAGS = [
    { key: 'mfa_enforcement',          name: 'MFA Enforcement',             description: 'Enforce MFA for all users',                       enabled: false, rollout_pct: 0   },
    { key: 'ai_evaluation_framework',  name: 'AI Evaluation Framework',     description: 'AI red-team evaluation runs',                     enabled: true,  rollout_pct: 100 },
    { key: 'compliance_workflow',      name: 'Compliance Workflow',         description: 'Compliance approval workflow engine',              enabled: true,  rollout_pct: 100 },
    { key: 'immutable_audit',          name: 'Immutable Audit',             description: 'SHA-256 hash-chained immutable audit logging',     enabled: true,  rollout_pct: 100 },
    { key: 'workspace_switching',      name: 'Workspace Switching',         description: 'Workspace switching for multi-workspace orgs',     enabled: true,  rollout_pct: 100 },
    { key: 'prometheus_metrics',       name: 'Prometheus Metrics',          description: 'Expose Prometheus /metrics endpoint',             enabled: true,  rollout_pct: 100 },
    { key: 'github_oauth',             name: 'GitHub OAuth',                description: 'GitHub OAuth 2.0 sign-in',                        enabled: false, rollout_pct: 0   },
    { key: 'advanced_rbac',            name: 'Advanced RBAC',               description: 'Fine-grained RBAC with custom roles',             enabled: true,  rollout_pct: 100 },
    { key: 'session_management',       name: 'Session Management',          description: 'Multi-device session tracking and revocation',     enabled: true,  rollout_pct: 100 },
    { key: 'superadmin_platform',      name: 'Super Admin Platform',        description: 'Super admin management platform',                 enabled: true,  rollout_pct: 100 },
  ];

  for (const flag of DEFAULT_FLAGS) {
    await prisma.feature_flags.upsert({
      where:  { key: flag.key },
      create: { key: flag.key, name: flag.name, description: flag.description, enabled: flag.enabled, rollout_pct: flag.rollout_pct },
      update: { name: flag.name, description: flag.description, rollout_pct: flag.rollout_pct },
    });
    console.log(`  ✅ ${flag.key}: ${flag.enabled ? 'enabled' : 'disabled'} (${flag.rollout_pct}%)`);
  }


  console.log('\n============================================================');
  console.log('  ✅ Enterprise seed completed successfully');
  console.log('============================================================\n');

  await prisma.$disconnect();
  await pool.end();
}

seedEnterprise().catch(e => {
  console.error('\n❌ Seed failed:', e.message);
  process.exit(1);
});
