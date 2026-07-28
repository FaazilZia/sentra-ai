-- CreateTable agents if not exists
CREATE TABLE IF NOT EXISTS "agents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "access_level" TEXT,
    "permissions" JSONB,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "posture_score" INTEGER,
    "last_posture_scan_at" TIMESTAMP(3),
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agents_organization_id_name_source_key" ON "agents"("organization_id", "name", "source");
CREATE INDEX IF NOT EXISTS "agents_organization_id_idx" ON "agents"("organization_id");

-- AlterTable
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "posture_score" INTEGER,
ADD COLUMN IF NOT EXISTS "last_posture_scan_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_posture_findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "remediation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_posture_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_posture_findings_organization_id_idx" ON "agent_posture_findings"("organization_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "agent_posture_findings_agent_id_idx" ON "agent_posture_findings"("agent_id");
