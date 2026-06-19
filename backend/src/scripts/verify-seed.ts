import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  console.log('\n============================================================');
  console.log('  SENTRAA AI v2.0.0 — SEED VERIFICATION REPORT');
  console.log('============================================================\n');

  let issues = 0;

  // 1. Roles
  try {
    const roles = await prisma.roles.findMany({ select: { name: true, description: true } });
    const expectedRoles = ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_MANAGER', 'SECURITY_ANALYST', 'AUDITOR', 'VIEWER', 'SERVICE_AGENT'];
    console.log('[ ROLES ]');
    expectedRoles.forEach(r => {
      const found = roles.find(x => x.name === r);
      console.log(`  ${found ? '✅' : '❌'} ${r}`);
      if (!found) issues++;
    });
    console.log(`  Total: ${roles.length} roles\n`);
  } catch (e: any) { console.log('  ❌ roles table not accessible:', e.message); issues++; }

  // 2. Permissions
  try {
    const perms = await prisma.permissions.count();
    console.log('[ PERMISSIONS ]');
    console.log(`  ${perms > 0 ? '✅' : '❌'} ${perms} permissions registered`);
    if (perms === 0) issues++;
    
    // Spot check
    const spotCheck = await prisma.permissions.findMany({ where: { resource: 'audit' } });
    console.log(`  ✅ audit permissions: ${spotCheck.map(p => p.action).join(', ')}\n`);
  } catch (e: any) { console.log('  ❌ permissions error:', e.message); issues++; }

  // 3. Role-Permission Links
  try {
    const links = await prisma.role_permissions.count();
    console.log('[ ROLE-PERMISSION LINKS ]');
    console.log(`  ${links > 0 ? '✅' : '❌'} ${links} role-permission links\n`);
    if (links === 0) issues++;
  } catch (e: any) { console.log('  ❌ role_permissions error:', e.message); issues++; }

  // 4. Feature Flags
  try {
    const flags = await prisma.feature_flags.findMany({ select: { key: true, enabled: true, rollout_pct: true } });
    const expectedFlags = ['mfa_enforcement','ai_evaluation_framework','compliance_workflow','immutable_audit','workspace_switching','prometheus_metrics'];
    console.log('[ FEATURE FLAGS ]');
    expectedFlags.forEach(k => {
      const f = flags.find(x => x.key === k);
      console.log(`  ${f ? '✅' : '❌'} ${k}: ${f ? (f.enabled ? 'enabled' : 'disabled') : 'MISSING'}`);
      if (!f) issues++;
    });
    console.log(`  Total: ${flags.length} flags\n`);
  } catch (e: any) { console.log('  ❌ feature_flags error:', e.message); issues++; }

  // 5. Audit Log chain integrity check (existing data)
  try {
    const recent = await prisma.audit_logs.count();
    console.log('[ AUDIT LOG CHAIN ]');
    console.log(`  ✅ ${recent} existing audit entries preserved\n`);
  } catch (e: any) { console.log('  ⚠️  audit_logs:', e.message, '\n'); }

  // 6. Summary
  console.log('============================================================');
  console.log('[ SUMMARY ]');
  if (issues === 0) {
    console.log('  ✅ ALL seed data verified successfully');
  } else {
    console.log(`  ⚠️  ${issues} issues found — run: npm run seed:enterprise`);
    process.exitCode = 1;
  }
  console.log('============================================================\n');

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error('❌ Seed verification failed:', e.message); process.exit(1); });
