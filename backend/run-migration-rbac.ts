import dotenv from 'dotenv';
import { Client } from 'pg';
import { runMigrationWithCleanup, TABLE_CATEGORIES, applyCrudPolicies } from './src/utils/migrationHelpers';

dotenv.config();

async function applyRbacRlsPolicies(client: Client, tables: string[]) {
  // Create is_admin() SECURITY DEFINER function for RBAC
  console.log('Creating is_admin() SECURITY DEFINER function...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 
        FROM users 
        WHERE id::text = user_id::text 
        AND role = 'ADMIN'
      );
    END;
    $$;

    REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public;
    GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
  `);

  for (const table of tables) {
    if (TABLE_CATEGORIES.sensitive.includes(table)) {
      await client.query(`CREATE POLICY "Deny all client access" ON "${table}" FOR ALL USING (false);`);
    } 
    else if (table === 'users') {
      await client.query(`CREATE POLICY "Users can select own profile" ON "users" FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND (id::text = auth.uid()::text OR is_admin(auth.uid())));`);
      await client.query(`CREATE POLICY "Users can update own profile" ON "users" FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND (id::text = auth.uid()::text OR is_admin(auth.uid()))) WITH CHECK (auth.uid() IS NOT NULL AND (id::text = auth.uid()::text OR is_admin(auth.uid())));`);
    }
    else if (table === 'incidents') {
      await client.query(`CREATE POLICY "Users can select own incidents" ON "incidents" FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND (user_id::text = auth.uid()::text OR resolved_by_id::text = auth.uid()::text OR is_admin(auth.uid())));`);
      await client.query(`CREATE POLICY "Users can update own incidents" ON "incidents" FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND (user_id::text = auth.uid()::text OR resolved_by_id::text = auth.uid()::text OR is_admin(auth.uid()))) WITH CHECK (auth.uid() IS NOT NULL AND (user_id::text = auth.uid()::text OR resolved_by_id::text = auth.uid()::text OR is_admin(auth.uid())));`);
    }
    else if (table === 'guardrail_overrides') {
      await client.query(`CREATE POLICY "Users can select own overrides" ON "guardrail_overrides" FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND (requested_by::text = auth.uid()::text OR approved_by::text = auth.uid()::text OR is_admin(auth.uid())));`);
      await client.query(`CREATE POLICY "Users can update own overrides" ON "guardrail_overrides" FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL AND (requested_by::text = auth.uid()::text OR approved_by::text = auth.uid()::text OR is_admin(auth.uid()))) WITH CHECK (auth.uid() IS NOT NULL AND (requested_by::text = auth.uid()::text OR approved_by::text = auth.uid()::text OR is_admin(auth.uid())));`);
    }
    else if (table === 'audit_logs') {
      await client.query(`CREATE POLICY "Users can select own audit logs" ON "audit_logs" FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND (user_id::text = auth.uid()::text OR is_admin(auth.uid())));`);
    }
    else if (TABLE_CATEGORIES.userOwned.includes(table)) {
      const policySql = `auth.uid() IS NOT NULL AND (user_id::text = auth.uid()::text OR is_admin(auth.uid()))`;
      await applyCrudPolicies(client, table, 'user', policySql);
    } 
    else if (TABLE_CATEGORIES.companyOwned.includes(table)) {
      const policySql = `NULLIF(auth.jwt() ->> 'organizationId', '') IS NOT NULL AND (organization_id::text = (auth.jwt() ->> 'organizationId') OR is_admin(auth.uid()))`;
      await applyCrudPolicies(client, table, 'company', policySql);
    }
    else if (table === 'companies') {
      const policySql = `NULLIF(auth.jwt() ->> 'organizationId', '') IS NOT NULL AND (id::text = (auth.jwt() ->> 'organizationId') OR is_admin(auth.uid()))`;
      await client.query(`CREATE POLICY "Users can select own company" ON "companies" FOR SELECT TO authenticated USING (${policySql});`);
    }
    else {
      await client.query(`CREATE POLICY "Deny unmapped access to ${table}" ON "${table}" FOR ALL USING (false);`);
    }
  }
}

runMigrationWithCleanup('RBAC Enterprise RLS', applyRbacRlsPolicies);
