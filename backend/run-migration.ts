import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Connecting to database...');
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  const client = new Client({ connectionString });

  try {
    await client.connect();
    
    console.log('Fetching all public tables...');
    const res = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `);
    const tables = res.rows.map(r => r.tablename);

    for (const table of tables) {
      console.log(`Securing table: ${table}`);
      
      // Drop all existing policies to start fresh
      try {
        const policyRes = await client.query(`
          SELECT policyname FROM pg_policies WHERE tablename = $1;
        `, [table]);
        for (const row of policyRes.rows) {
          await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON "${table}";`);
        }
      } catch (e) {}

      // Enable RLS
      await client.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      
      const userOwnedTables = ['requests', 'consent_records', 'interception_logs', 'user_roles'];
      const companyOwnedTables = ['policies', 'logs', 'policy_versions', 'ai_agents', 'drift_alerts', 'connectors', 'scan_jobs'];
      const sensitiveTables = ['api_keys', 'refresh_tokens'];

      if (sensitiveTables.includes(table)) {
        await client.query(`CREATE POLICY "Deny all client access" ON "${table}" FOR ALL USING (false);`);
      } 
      else if (table === 'users') {
        // Users can select/update their own profile OR if they are an admin
        await client.query(`CREATE POLICY "Users can select own profile" ON "users" FOR SELECT TO authenticated USING (id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
        await client.query(`CREATE POLICY "Users can update own profile" ON "users" FOR UPDATE TO authenticated USING (id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin') WITH CHECK (id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
      }
      else if (table === 'incidents') {
        await client.query(`CREATE POLICY "Users can select own incidents" ON "incidents" FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text OR resolved_by_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
        await client.query(`CREATE POLICY "Users can update own incidents" ON "incidents" FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text OR resolved_by_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin') WITH CHECK (user_id::text = auth.uid()::text OR resolved_by_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
      }
      else if (table === 'guardrail_overrides') {
        await client.query(`CREATE POLICY "Users can select own overrides" ON "guardrail_overrides" FOR SELECT TO authenticated USING (requested_by::text = auth.uid()::text OR approved_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
        await client.query(`CREATE POLICY "Users can update own overrides" ON "guardrail_overrides" FOR UPDATE TO authenticated USING (requested_by::text = auth.uid()::text OR approved_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin') WITH CHECK (requested_by::text = auth.uid()::text OR approved_by::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
      }
      else if (table === 'audit_logs') {
        // Strict lockdown for audit logs: No direct client inserts/updates
        await client.query(`CREATE POLICY "Users can select own audit logs" ON "audit_logs" FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
      }
      else if (userOwnedTables.includes(table)) {
        const policySql = `user_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin'`;
        await client.query(`CREATE POLICY "Users can select own ${table}" ON "${table}" FOR SELECT TO authenticated USING (${policySql});`);
        await client.query(`CREATE POLICY "Users can insert own ${table}" ON "${table}" FOR INSERT TO authenticated WITH CHECK (${policySql});`);
        await client.query(`CREATE POLICY "Users can update own ${table}" ON "${table}" FOR UPDATE TO authenticated USING (${policySql}) WITH CHECK (${policySql});`);
        await client.query(`CREATE POLICY "Users can delete own ${table}" ON "${table}" FOR DELETE TO authenticated USING (${policySql});`);
      } 
      else if (companyOwnedTables.includes(table)) {
        const policySql = `company_id::text = (auth.jwt() ->> 'company_id') OR (auth.jwt() ->> 'role') = 'admin'`;
        await client.query(`CREATE POLICY "Users can select company ${table}" ON "${table}" FOR SELECT TO authenticated USING (${policySql});`);
        await client.query(`CREATE POLICY "Users can insert company ${table}" ON "${table}" FOR INSERT TO authenticated WITH CHECK (${policySql});`);
        await client.query(`CREATE POLICY "Users can update company ${table}" ON "${table}" FOR UPDATE TO authenticated USING (${policySql}) WITH CHECK (${policySql});`);
        await client.query(`CREATE POLICY "Users can delete company ${table}" ON "${table}" FOR DELETE TO authenticated USING (${policySql});`);
      }
      else if (table === 'companies') {
        const policySql = `id::text = (auth.jwt() ->> 'company_id') OR (auth.jwt() ->> 'role') = 'admin'`;
        await client.query(`CREATE POLICY "Users can select own company" ON "companies" FOR SELECT TO authenticated USING (${policySql});`);
      }
      else {
        // Fallback: Extremely strict backend-only access for tables without explicit ownership mapping
        await client.query(`CREATE POLICY "Deny unmapped access to ${table}" ON "${table}" FOR ALL USING (false);`);
      }
    }
    
    console.log('Enterprise RLS Migration executed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

main();
