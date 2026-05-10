-- Database Security Implementation
-- This script enables Row Level Security (RLS) on all tables and applies baseline safe policies.

-- 1. Enable RLS on all tables
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "policy_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_dependencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drift_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connectors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scan_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_fix_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interception_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "guardrail_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outcome_validations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "monitoring_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_drift" ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing permissive public policies if they exist (clean slate)
-- (Not strictly necessary for a fresh RLS enable, but good practice if applied via Prisma previously)

-- 3. Highly Sensitive Tables (api_keys, refresh_tokens)
-- These should NEVER be readable or writable by any client (anon or authenticated).
-- Only the backend Node.js server using the service_role key can interact with them.
CREATE POLICY "Deny all client access to api_keys" ON "api_keys" FOR ALL USING (false);
CREATE POLICY "Deny all client access to refresh_tokens" ON "refresh_tokens" FOR ALL USING (false);

-- 4. User Table
-- Users can only read their own data.
CREATE POLICY "Users can only read their own data" ON "users" FOR SELECT TO authenticated USING (id::text = auth.uid()::text);
CREATE POLICY "Users can only update their own data" ON "users" FOR UPDATE TO authenticated USING (id::text = auth.uid()::text);
-- No insert or delete from client directly. Handled by backend/auth.

-- 5. Baseline Authenticated Read Access for Standard Tables
-- The following tables contain operational data. We allow authenticated users to read.
-- We do not allow public/anon access.
CREATE POLICY "Auth users can read companies" ON "companies" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read policies" ON "policies" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read logs" ON "logs" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read incidents" ON "incidents" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read policy_versions" ON "policy_versions" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read ai_agents" ON "ai_agents" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read ai_dependencies" ON "ai_dependencies" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read drift_alerts" ON "drift_alerts" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read connectors" ON "connectors" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read scan_jobs" ON "scan_jobs" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read consent_records" ON "consent_records" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read compliance_fix_tasks" ON "compliance_fix_tasks" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read evidence_records" ON "evidence_records" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read compliance_snapshots" ON "compliance_snapshots" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read audit_logs" ON "audit_logs" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read alerts" ON "alerts" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read interception_logs" ON "interception_logs" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read guardrail_overrides" ON "guardrail_overrides" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read requests" ON "requests" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read roles" ON "roles" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read user_roles" ON "user_roles" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read outcome_validations" ON "outcome_validations" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read monitoring_status" ON "monitoring_status" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can read compliance_drift" ON "compliance_drift" FOR SELECT TO authenticated USING (true);

-- 6. Write Access (Insert/Update/Delete)
-- For a secure enterprise system, most writes should happen via the backend API using the service_role key.
-- We will deny client-side writes by default unless explicitly needed.
-- (No policies created for INSERT/UPDATE/DELETE defaults to DENY when RLS is enabled)

-- End of Migration
