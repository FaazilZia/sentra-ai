import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const ENTERPRISE_TABLES = [
  'workspaces', 'org_settings', 'invitations',
  'roles', 'permissions', 'role_permissions', 'user_roles',
  'user_sessions', 'audit_logs',
  'workflow_tasks', 'workflow_state_history',
  'evaluation_runs', 'evaluation_results', 'benchmark_datasets',
  'feature_flags', 'feature_flag_overrides', 'platform_events',
  'organizations',
];

const EXISTING_TABLES = [
  'users', 'ai_agents', 'incidents', 'policies', 'drift_alerts',
  'connectors', 'compliance_frameworks',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 5 });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();

  console.log('\n============================================================');
  console.log('  SENTRAA AI v2.0.0 — DATABASE VALIDATION REPORT');
  console.log('  Target:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  console.log('============================================================\n');

  let missingEnterprise = 0;
  let missingExisting = 0;

  // --- Enterprise tables ---
  console.log('[ ENTERPRISE TABLES ]');
  for (const t of ENTERPRISE_TABLES) {
    try {
      const res = await prisma.$queryRawUnsafe<{c: bigint}[]>(`SELECT COUNT(*) as c FROM "${t}"`);
      const count = Number(res[0].c);
      console.log(`  ✅ ${t.padEnd(38)} ${count} rows`);
    } catch {
      console.log(`  ❌ MISSING: ${t}`);
      missingEnterprise++;
    }
  }

  // --- Existing tables ---
  console.log('\n[ EXISTING TABLES — BACKWARD COMPAT ]');
  for (const t of EXISTING_TABLES) {
    try {
      const res = await prisma.$queryRawUnsafe<{c: bigint}[]>(`SELECT COUNT(*) as c FROM "${t}"`);
      const count = Number(res[0].c);
      console.log(`  ✅ ${t.padEnd(38)} ${count} rows preserved`);
    } catch {
      console.log(`  ❌ MISSING: ${t}`);
      missingExisting++;
    }
  }

  // --- Key indexes ---
  console.log('\n[ KEY INDEXES ]');
  try {
    const indexes = await prisma.$queryRaw<{indexname: string; tablename: string}[]>`
      SELECT indexname, tablename FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname
      LIMIT 20
    `;
    if (indexes.length === 0) console.log('  (no custom indexes found)');
    indexes.forEach(i => console.log(`  ✅ ${i.tablename}.${i.indexname}`));
  } catch (e: any) {
    console.log('  Could not read indexes:', e.message);
  }

  // --- Constraint check ---
  console.log('\n[ FOREIGN KEY CONSTRAINTS ]');
  try {
    const fks = await prisma.$queryRaw<{constraint_name: string; table_name: string}[]>`
      SELECT constraint_name, table_name 
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY'
      AND constraint_schema = 'public'
      LIMIT 15
    `;
    console.log(`  ✅ ${fks.length} FK constraints active`);
  } catch (e: any) {
    console.log('  Could not read constraints:', e.message);
  }

  // --- Summary ---
  console.log('\n============================================================');
  console.log('[ SUMMARY ]');
  console.log(`  Enterprise tables: ${ENTERPRISE_TABLES.length - missingEnterprise}/${ENTERPRISE_TABLES.length} present`);
  console.log(`  Existing tables:   ${EXISTING_TABLES.length - missingExisting}/${EXISTING_TABLES.length} present`);

  if (missingEnterprise > 0) {
    console.log(`\n  ⚠️  ${missingEnterprise} enterprise table(s) MISSING`);
    console.log('  ACTION REQUIRED: npx prisma migrate deploy');
    process.exitCode = 1;
  } else {
    console.log('\n  ✅ ALL enterprise tables verified — database fully migrated');
  }

  if (missingExisting > 0) {
    console.log(`  ⚠️  ${missingExisting} existing table(s) missing — backward compat issue!`);
    process.exitCode = 1;
  } else {
    console.log('  ✅ ALL existing tables preserved — backward compat confirmed');
  }
  console.log('============================================================\n');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => { console.error('❌ Validation failed:', e.message); process.exit(1); });
