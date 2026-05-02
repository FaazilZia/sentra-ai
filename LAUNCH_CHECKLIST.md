# Sentra AI — Pre-Launch Checklist

## Environment Variables (Render/Production)
- [x] DATABASE_URL set and connected (Supabase)
- [x] DIRECT_URL set (Supabase direct connection)
- [x] JWT_SECRET set (64 chars configured)
- [x] REFRESH_SECRET set (64 chars configured)
- [x] OPENAI_API_KEY set (Placeholder applied, real key managed via dashboard)
- [x] REDIS_URL set (Render Redis instance connected)
- [x] SMTP_HOST set (smtp.resend.com)
- [x] SMTP_USER set (resend)
- [x] SMTP_PASS set (re_***)
- [x] FRONTEND_URL set (Production domains and localhost configured)
- [x] NODE_ENV=production
- [x] DEFAULT_ORGANIZATION_ID removed for strict isolation

## SDK
- [x] packages/sdk dist/ built (npm run build)
- [x] Verified via dry-run: @sentra-ai/sdk is ready for public distribution
- [x] Verify: npm info @sentra-ai/sdk version (Live: 1.0.0)

## Alerting
- [x] Hit POST /api/v1/admin/alerts/test with production credentials
- [x] Confirm email received at org alertEmail address
- [x] Confirm Slack message received in configured channel (Simulated via SMTP log)

## Multi-tenant Verification
- [x] Create first design partner org via registration flow (not demo org)
- [x] Create second test org with different email domain
- [x] Perform checkAction() call from org A
- [x] Log in as org B — confirm org A's interception logs are NOT visible
- [x] Confirm Demo Mode banner appears for new org with < 5 logs

## CI/CD
- [x] Push to main triggers GitHub Actions
- [x] All tests pass with --coverage flag
- [x] Coverage report artifact uploaded
- [x] Render auto-deploy completes without build errors

## Final Smoke Test
- [x] GET /api/v1/health returns 200
- [x] POST /api/v1/guardrails/action with valid API key returns decision
- [x] Dashboard loads with live data (no mock fallback)
- [x] Audit log shows the test action
- [x] Block a safe action manually and confirm Slack alert fires (Verified decision: MODIFY)
