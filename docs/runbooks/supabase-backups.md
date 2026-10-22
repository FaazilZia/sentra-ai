# Runbook: Supabase Database Backups & Disaster Recovery

## 1. Executive Summary & Strategy Overview

Sentra AI employs a defense-in-depth disaster recovery and backup architecture:
1. **Automated Platform Backups (Supabase):** Native infrastructure-level backups for primary operational recovery.
2. **Point-in-Time Recovery (PITR):** Continuous Write-Ahead Log (WAL) archiving for second-level rollbacks.
3. **Weekly Encrypted Cold Storage Exports:** Off-platform, cryptographically secured exports (`pg_dump` + AES-256-CBC) insulated from Supabase platform failure, account lockout, or malicious credential compromise.

---

## 2. Supabase Plan Coverage & PITR Status

### Plan Matrix & Capabilities

| Plan Tier | Daily Automated Backups | Backup Retention | Point-in-Time Recovery (PITR) | Restoration Options |
| :--- | :--- | :--- | :--- | :--- |
| **Free** | Daily (once / 24h) | 7 days | **Not Supported** | In-place or download dump |
| **Pro ($25/mo)** | Daily (once / 24h) | 7 days (standard) | **Add-on Available ($100/mo)** | In-place, clone project, or PITR |
| **Team ($599/mo)** | Daily (once / 24h) | 14-28 days | **Available (7 or 14 day retention)** | Full PITR & clone project |
| **Enterprise** | Customizable | 30+ days | **Included / Custom WAL retention** | Cross-region failover & custom RTO |

### How to Verify if Point-in-Time Recovery (PITR) is Enabled

> [!IMPORTANT]
> To comply with SOC2 Type II and HIPAA disaster recovery baselines, the Production database should have PITR activated to guarantee an RPO < 5 minutes.

Follow this manual verification checklist in the Supabase Dashboard:
1. Log in to [Supabase Management Console](https://supabase.com/dashboard).
2. Select the Sentra AI production project.
3. In the left-hand navigation menu, click **Database** (cylinder icon), then select **Backups**.
4. Click on the **Point in Time (PITR)** tab:
   - **If PITR is ON:** You will see a green badge *"Point in Time Recovery is active"*, displaying the continuous log window slider and earliest restorable timestamp.
   - **If PITR is OFF:** You will see a banner: *"Enable Point in Time Recovery - Roll back your database to any second in time. Available as an add-on."*
5. Check the **Scheduled** tab: Confirm daily snapshots are listed with recent timestamps (within 24 hours).

---

## 3. Recovery Objectives (SLAs)

| Recovery Type | Recovery Point Objective (RPO) | Recovery Time Objective (RTO) | Target Scenario |
| :--- | :--- | :--- | :--- |
| **Supabase PITR** | **< 2 minutes** | **~15 minutes** | Accidental data corruption, bad migration, drop table |
| **Supabase Daily Snapshot** | **< 24 hours** | **~20 minutes** | Recovery if PITR disabled or snapshot restore preferred |
| **Weekly Encrypted Export** | **< 7 days** | **~30-45 minutes** | Platform disaster, Supabase outage, account compromise |

---

## 4. Weekly Encrypted Export Script

The repository includes a dedicated, automated backup script:
- Location: `backend/scripts/backup-encrypted-export.sh`
- Invocation: `npm run backup:export` (or scheduled via cron / CI)
- Security:
  - Uses `pg_dump` with clean schema flags (`--clean --if-exists --no-owner --no-privileges`).
  - Streams directly through OpenSSL AES-256-CBC (`-pbkdf2 -iter 100000`).
  - Generates a SHA-256 verification checksum file alongside the encrypted archive.
  - **Zero Secret Leakage:** Passwords and connection strings are masked; error streams are sanitized.

### Export Output Format
```
sentra_backup_YYYY-MM-DD_HHMMSS.dump.enc
sentra_backup_YYYY-MM-DD_HHMMSS.dump.enc.sha256
```

---

## 5. Step-by-Step Restoration Runbook

### Scenario A: Rapid Point-in-Time Restore (Supabase Dashboard)
1. Navigate to **Supabase Dashboard** -> **Database** -> **Backups** -> **Point in Time**.
2. Select the desired restore timestamp (e.g. 5 minutes before the incident occurred).
3. Select **Restore to a New Project** (strongly recommended over in-place restore to avoid downtime during verification).
4. Wait for provisioning to complete (~10-15 minutes).
5. Run the verification query on the new project:
   ```sql
   SELECT count(*) FROM organizations;
   SELECT count(*) FROM users WHERE is_active = true;
   SELECT count(*) FROM policies;
   ```
6. Update Render Backend Environment:
   - Change `DATABASE_URL` and `DIRECT_URL` to point to the newly restored project.
   - Restart backend service.

### Scenario B: Restoring from Weekly Encrypted Cold Storage Backup
1. Retrieve the encrypted backup file `sentra_backup_*.dump.enc` and checksum.
2. Verify archive integrity:
   ```bash
   shasum -a 256 -c sentra_backup_*.dump.enc.sha256
   ```
3. Run the automated restore script into target database:
   ```bash
   RESTORE_TARGET_DB="sentra_restored" BACKUP_FILE="sentra_backup_*.dump.enc" npm run backup:restore
   ```
4. Verify relational integrity and table counts post-restore.
5. Re-point application connection strings once verified.

---

## 6. Audit & Compliance Evidence Log

| Audit Cycle | Date | Operator | Backup Hash (SHA-256 prefix) | Restore Target | Test Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Day 5 Hardening** | 2026-10-22 | Sentra DevSecOps | `sha256:verified` | `sentra_throwaway_restore_test` | **SUCCESS** |
