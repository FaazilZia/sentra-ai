-- CreateTable: jira_config
CREATE TABLE IF NOT EXISTS "jira_config" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "site_url" TEXT NOT NULL,
    "project_key" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "api_token" TEXT NOT NULL,
    "issue_type" TEXT NOT NULL DEFAULT 'Task',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hourly_cap" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jira_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex IF NOT EXISTS for jira_config
CREATE UNIQUE INDEX IF NOT EXISTS "jira_config_organization_id_key" ON "jira_config"("organization_id");
CREATE INDEX IF NOT EXISTS "jira_config_organization_id_idx" ON "jira_config"("organization_id");

-- AddForeignKey IF NOT EXISTS for jira_config
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jira_config_organization_id_fkey'
    ) THEN
        ALTER TABLE "jira_config" ADD CONSTRAINT "jira_config_organization_id_fkey" 
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: add jira columns to incidents
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "jira_issue_key" TEXT;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "jira_issue_url" TEXT;

-- CreateTable: jira_summary_tickets
CREATE TABLE IF NOT EXISTS "jira_summary_tickets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "hour_key" TEXT NOT NULL,
    "issue_key" TEXT NOT NULL,
    "incident_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jira_summary_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex IF NOT EXISTS for jira_summary_tickets
CREATE UNIQUE INDEX IF NOT EXISTS "jira_summary_tickets_organization_id_hour_key_key" ON "jira_summary_tickets"("organization_id", "hour_key");
CREATE INDEX IF NOT EXISTS "jira_summary_tickets_organization_id_idx" ON "jira_summary_tickets"("organization_id");

-- AddForeignKey IF NOT EXISTS for jira_summary_tickets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jira_summary_tickets_organization_id_fkey'
    ) THEN
        ALTER TABLE "jira_summary_tickets" ADD CONSTRAINT "jira_summary_tickets_organization_id_fkey" 
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
