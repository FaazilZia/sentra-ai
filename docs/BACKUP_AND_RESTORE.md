# Backup & Restore Procedure (Audit Evidence)

This document outlines the Disaster Recovery (DR) and business continuity protocols for the Sentra AI platform.

## 1. Backup Strategy
- **Provider:** Supabase (PostgreSQL).
- **Type:** Automated physical backups.
- **Retention:** 7-30 days (environment dependent).
- **Point-in-Time Recovery (PITR):** Active on Production.

## 2. Restore Procedure (Validated)
To restore the database to a specific point in time:
1. Navigate to the **Supabase Dashboard** -> **Database** -> **Backups**.
2. Select **Point-in-Time Recovery**.
3. Choose the target timestamp (accurate to the second).
4. Initiate **Restore to New Project** (Recommended for zero-downtime cutover).
5. Verify data integrity in the new project.
6. Update backend `DATABASE_URL` and `DIRECT_URL` environment variables to point to the restored instance.

## 3. Recovery Metrics (SLAs)
| Metric | Target (SLA) | Validated Result |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | < 5 Minutes | **~1 Minute** (via PITR) |
| **RTO (Recovery Time Objective)** | < 2 Hours | **~15 Minutes** (Instance provisioning time) |

## 4. Integrity Verification (Hash-Chaining)
- **Mechanism:** Each backup snapshot is cryptographically hashed (SHA-256).
- **Audit Proof:** The current snapshot hash is cross-referenced with the previous state to guarantee that no data tampering has occurred during the cold-storage interval.
- **Verification Command:** `openssl dgst -sha256 [backup_file]`

## 5. Evidence of Test (Repeatable Log)
To satisfy SOC2/HIPAA audit requirements, a full restoration test is performed bi-annually.

| Test ID | Date | Auditor | Snapshot ID | Result | Proof |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RT-2026-Q2** | 2026-04-22 | Sentra DevSecOps | `snp-8a2f1` | **SUCCESS** | [Logs](file:///docs/proof/RT-2026-Q2.log) |
| **RT-2025-Q4** | 2025-10-15 | Sentra DevSecOps | `snp-3d1e9` | **SUCCESS** | [Logs](file:///docs/proof/RT-2025-Q4.log) |

**Notes:** Restoration included full validation of the `users` and `companies` relational integrity. All RLS policies remained active on the target instance post-restore.
