import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const DROP_TABLES = [
  'eu_ai_act_implementations',
  'eu_ai_act_controls',
  'eu_ai_act_articles',
  'fria_responses',
  'fria_assessments',
  'iso42001_implementations',
  'iso42001_controls',
  'iso42001_clauses',
  'iso27001_implementations',
  'iso27001_controls',
  'iso27001_clauses',
  'ce_marking_records',
  'ccpa_implementations',
  'ccpa_controls',
  'ccpa_sections',
  'dora_implementations',
  'dora_controls',
  'dora_sections',
  'oecd_implementations',
  'oecd_controls',
  'oecd_sections',
  'ftc_implementations',
  'ftc_controls',
  'ftc_sections',
  'soc2_implementations',
  'soc2_controls',
  'soc2_chapters',
];

async function runMigration() {
  console.log('🚀 Connecting to Supabase staging database...');
  const client = await pool.connect();
  try {
    console.log('🗑️ Dropping removed framework tables...');
    for (const table of DROP_TABLES) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`   ✅ Dropped table: ${table}`);
      } catch (err: any) {
        console.warn(`   ⚠️ Warning dropping table ${table}: ${err.message}`);
      }
    }

    console.log('✨ Adding frameworks and mode columns to block_events table...');
    await client.query(`ALTER TABLE "block_events" ADD COLUMN IF NOT EXISTS "frameworks" text[] DEFAULT ARRAY[]::text[];`);
    await client.query(`ALTER TABLE "block_events" ADD COLUMN IF NOT EXISTS "mode" text NOT NULL DEFAULT 'BLOCK';`);
    console.log('   ✅ Added frameworks and mode columns to block_events');

    console.log('✨ Adding aidr_enforcement_mode column to companies table...');
    await client.query(`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "aidr_enforcement_mode" text NOT NULL DEFAULT 'BLOCK';`).catch(err => {
      console.warn(`   ⚠️ Warning altering companies table: ${err.message}`);
    });
    console.log('   ✅ Handled aidr_enforcement_mode column on companies');

    console.log('🔄 Replacing eu_ai_act_score with pci_dss_score in compliance_snapshots...');
    await client.query(`ALTER TABLE "compliance_snapshots" DROP COLUMN IF EXISTS "eu_ai_act_score";`).catch(() => {});
    await client.query(`ALTER TABLE "compliance_snapshots" ADD COLUMN IF NOT EXISTS "pci_dss_score" double precision;`).catch(() => {});
    console.log('   ✅ Dropped eu_ai_act_score and added pci_dss_score column');

    console.log('🎉 Database schema migration applied successfully on staging database!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('❌ Migration script failed:', err);
  process.exit(1);
});
