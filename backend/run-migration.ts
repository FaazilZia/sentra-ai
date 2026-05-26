import dotenv from 'dotenv';
import { Client } from 'pg';
import { runMigrationWithCleanup, TABLE_CATEGORIES, applyCrudPolicies } from './src/utils/migrationHelpers';

dotenv.config();

async function applyBasicRlsPolicies(client: Client, tables: string[]) {
  for (const table of tables) {
    if (TABLE_CATEGORIES.sensitive.includes(table)) {
      await client.query(`CREATE POLICY "Deny all client access" ON "${table}" FOR ALL USING (false);`);
    } 
    else if (table === 'users') {
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
      await client.query(`CREATE POLICY "Users can select own audit logs" ON "audit_logs" FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin');`);
    }
    else if (TABLE_CATEGORIES.userOwned.includes(table)) {
      const policySql = `user_id::text = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin'`;
      await applyCrudPolicies(client, table, 'user', policySql);
    } 
    else if (TABLE_CATEGORIES.companyOwned.includes(table)) {
      const policySql = `company_id::text = (auth.jwt() ->> 'company_id') OR (auth.jwt() ->> 'role') = 'admin'`;
      await applyCrudPolicies(client, table, 'company', policySql);
    }
    else if (table === 'companies') {
      const policySql = `id::text = (auth.jwt() ->> 'company_id') OR (auth.jwt() ->> 'role') = 'admin'`;
      await client.query(`CREATE POLICY "Users can select own company" ON "companies" FOR SELECT TO authenticated USING (${policySql});`);
    }
    else {
      await client.query(`CREATE POLICY "Deny unmapped access to ${table}" ON "${table}" FOR ALL USING (false);`);
    }
  }
}

runMigrationWithCleanup('Enterprise RLS', applyBasicRlsPolicies);
