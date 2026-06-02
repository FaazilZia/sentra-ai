import { Client } from 'pg';
import logger from './logger';

/**
 * Shared RLS migration helpers used by both run-migration.ts and run-migration-rbac.ts.
 * Eliminates structural duplication in migration scripts.
 */

export async function createMigrationClient(): Promise<Client> {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

export async function fetchPublicTables(client: Client): Promise<string[]> {
  const res = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
  `);
  return res.rows.map(r => r.tablename);
}

export async function dropExistingPolicies(client: Client, table: string): Promise<void> {
  try {
    const policyRes = await client.query(
      `SELECT policyname FROM pg_policies WHERE tablename = $1;`,
      [table]
    );
    for (const row of policyRes.rows) {
      await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON "${table}";`);
    }
  } catch (_e) { /* table may not exist in pg_policies */ }
}

export async function enableRLS(client: Client, table: string): Promise<void> {
  await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
}

export const TABLE_CATEGORIES = {
  userOwned: ['requests', 'consent_records', 'interception_logs', 'user_roles'],
  companyOwned: ['policies', 'logs', 'policy_versions', 'ai_agents', 'drift_alerts', 'connectors', 'scan_jobs'],
  sensitive: ['api_keys', 'refresh_tokens'],
} as const;

export async function applyCrudPolicies(
  client: Client,
  table: string,
  ownerType: 'user' | 'company',
  policySql: string
): Promise<void> {
  const label = ownerType === 'user' ? 'own' : 'company';
  await client.query(`CREATE POLICY "Users can select ${label} ${table}" ON "${table}" FOR SELECT TO authenticated USING (${policySql});`);
  await client.query(`CREATE POLICY "Users can insert ${label} ${table}" ON "${table}" FOR INSERT TO authenticated WITH CHECK (${policySql});`);
  await client.query(`CREATE POLICY "Users can update ${label} ${table}" ON "${table}" FOR UPDATE TO authenticated USING (${policySql}) WITH CHECK (${policySql});`);
  await client.query(`CREATE POLICY "Users can delete ${label} ${table}" ON "${table}" FOR DELETE TO authenticated USING (${policySql});`);
}

export async function runMigrationWithCleanup(
  label: string,
  applyPolicies: (client: Client, tables: string[]) => Promise<void>
): Promise<void> {
  logger.info('Connecting to database...');
  const client = await createMigrationClient();

  try {
    logger.info('Fetching all public tables...');
    const tables = await fetchPublicTables(client);

    for (const table of tables) {
      logger.info(`Securing table: ${table}`);
      await dropExistingPolicies(client, table);
      await enableRLS(client, table);
    }

    await applyPolicies(client, tables);
    logger.info(`${label} Migration executed successfully!`);
  } catch (error) {
    logger.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}
