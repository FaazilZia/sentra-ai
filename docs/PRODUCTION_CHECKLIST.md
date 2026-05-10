# Sentra AI - Production Deployment & Audit Checklist

This checklist documents the infrastructure configurations implemented for enterprise audit compliance.

## 1. Secrets Management
- [x] All `.env` variables have been mapped into the hosting platform (Vercel/Render).
- [x] `.env` is explicitly included in `.gitignore` to prevent secret leakage.
- [x] `DIRECT_URL` (Supabase Postgres) is restricted to CI/CD and Backend Runtime instances only.
- [ ] Implement Vercel Secret Manager / AWS Secrets Manager rotation (Recommended: Every 90 days).

## 2. Environment Separation
- [x] **Dev (`dev` branch):** Connects to `sentra-ai-dev` Supabase project. Used for feature branches and local development.
- [x] **Staging (`staging` branch):** Connects to `sentra-ai-staging`. Matches production schema. Used for QA.
- [x] **Production (`main` branch):** Connects to `sentra-ai-prod`. Locked down with strict RBAC, Audit Logging, and PITR.

## 3. Database Backup & Disaster Recovery (DR)
- [x] **Automated Backups:** Supabase Cloud creates automated daily physical backups.
- [x] **Point-in-Time Recovery (PITR):** Enable PITR in the Supabase Dashboard under Database -> Backups.
- [x] **Retention Policy:** 7 days configured for standard plans. Must be extended to 30 days via Supabase Support for HIPAA/SOC2.
- [ ] **Test RTO/RPO:** Conduct a simulated data restoration to an alternate database every 6 months to guarantee Recovery Time Objectives.

## 4. Security Networking & Telemetry
- [x] **Transport Security:** TLS 1.2+ implicitly enforced by Vercel and Render edge networks.
- [x] **Headers:** Strict `helmet` config applied (HSTS, DENY iframe framing, CSP).
- [x] **Distributed Rate Limiting:** Configured `ioredis` for multi-instance abuse protection on `/api` and `/auth`.
- [x] **Error Tracking:** `@sentry/node` initialized for immediate anomaly tracking.

## 5. Runtime Lease Privilege
- [x] Create restricted Postgres role:
  ```sql
  CREATE ROLE app_runtime NOLOGIN;
  GRANT USAGE ON SCHEMA public TO app_runtime;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
  -- Update DATABASE_URL to use this role instead of `postgres`.
  ```
