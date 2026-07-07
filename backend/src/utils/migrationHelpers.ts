import { Client } from 'pg';

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

