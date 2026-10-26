# Production Database Migration Runbook

## Overview & Scope
This runbook defines the operational procedure for deploying Prisma database migrations to the Sentraa AI production database (`Supabase PostgreSQL`).

All production migrations are executed via the dedicated GitHub Actions workflow:
**`.github/workflows/deploy-migrations.yml`**

---

## Safety Requirements & Pre-Requisites

1. **Required Reviewer Approval**:
   The workflow is bound to the GitHub Environment `production-migrations`. No migration can execute without explicit written sign-off by the designated repository reviewer.
2. **Session Pooler Only (Port 5432)**:
   Migrations require session-level advisory locks (`pg_advisory_lock`). They must NEVER run against the port `6543` transaction pooler. The workflow enforces port `5432` and fails immediately if any other port is supplied.
3. **Fresh Backup Requirement (< 24 Hours)**:
   The workflow verifies that a successful run of `Weekly Encrypted Database Backup` (`weekly-backup.yml`) exists from the last 24 hours. If no backup is detected, the run aborts before inspecting or touching the schema.
4. **Permanent Prohibitions**:
   - NEVER run `prisma migrate resolve`, `prisma db push`, `prisma migrate reset`, or `prisma migrate dev` against production.
   - NEVER edit the `_prisma_migrations` table manually.

---

## Deployment Order of Operations

### Scenario A: Additive (Backward-Compatible) Changes
*Examples: Adding a new nullable column, adding a column with a default value, creating a new table, adding an index.*

1. **Verify / Run Fresh Backup**:
   Confirm a backup ran in the last 24 hours or trigger `weekly-backup.yml` manually.
2. **Dry Run Preview**:
   Run `Deploy Production Migrations` with input `dry_run: true`.
   - Inspect the pending migration list in the Actions console.
   - Verify that only expected migrations are listed.
3. **Execute Migration**:
   Run `Deploy Production Migrations` with input `dry_run: false`.
   - The reviewer approves the environment gate.
   - `npx prisma migrate deploy` executes in one transaction.
   - The workflow checks `https://sentra-backend-node.onrender.com/ready` to verify schema health.
4. **Deploy Application Code**:
   Merge and deploy the feature branch containing backend code that utilizes the new columns/tables.

---

### Scenario B: Destructive Changes (Expand-Contract Two-Step Release)
*Examples: Dropping a column, renaming a column, altering a column type, adding a NOT NULL constraint without a default.*

Destructive changes MUST NEVER be deployed in a single step because the running backend application continues serving user traffic while migrations are applied.

#### Step 1: Expand Phase
1. Add the new column/table as nullable.
2. Deploy the migration using the workflow (`dry_run: false`).
3. Deploy application code that:
   - Writes to both old and new columns.
   - Reads from the new column with fallback to old.
4. Run a background script to backfill historical data from old column to new column.

#### Step 2: Contract Phase
1. Deploy application code that only reads/writes the new column and removes all code references to the old column.
2. Deploy the migration dropping or altering the old column using the workflow (`dry_run: false`).

---

## How to Run the Workflow

1. Navigate to **Actions** > **Deploy Production Migrations** on GitHub.
2. Click **Run workflow**:
   - Choose `Branch: main`.
   - Select `dry_run: true` for the initial dry-run preview.
   - Click **Run workflow**.
3. Inspect the run output to review pending migrations.
4. Once verified, click **Run workflow** again with `dry_run: false`.
5. When prompted by GitHub Actions, the required reviewer approves the `production-migrations` environment deployment.
6. The job applies the migration via `npx prisma migrate deploy` and verifies that `/ready` returns HTTP 200 with `checks.schema: ok`.

---

## Failure Recovery & Rollback

- If the migration job fails during `prisma migrate deploy`, review the error log in GitHub Actions.
- Because migrations run inside PostgreSQL transactions, failed DDL is automatically rolled back by Postgres.
- Check `/ready` on `https://sentra-backend-node.onrender.com/ready` to verify whether the running service remains healthy.
- If data corruption or an unrecoverable failure occurs, restore from the latest encrypted backup following `docs/BACKUP_AND_RESTORE.md`.
