/*
  Warnings:

  - You are about to drop the column `eu_ai_act_score` on the `compliance_snapshots` table. All the data in the column will be lost.
  - You are about to drop the column `eu_ai_act_score` on the `governance_posture_snapshots` table. All the data in the column will be lost.
  - You are about to drop the `ccpa_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ccpa_implementations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ccpa_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ce_marking_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dora_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dora_implementations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `dora_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eu_ai_act_articles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eu_ai_act_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `eu_ai_act_implementations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fria_assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fria_responses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ftc_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ftc_implementations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ftc_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iso27001_clauses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iso27001_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iso27001_implementations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iso42001_clauses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iso42001_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iso42001_implementations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `oecd_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `oecd_implementations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `oecd_sections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `soc2_chapters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `soc2_controls` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `soc2_implementations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ccpa_controls" DROP CONSTRAINT "ccpa_controls_section_id_fkey";

-- DropForeignKey
ALTER TABLE "ccpa_implementations" DROP CONSTRAINT "ccpa_implementations_control_id_fkey";

-- DropForeignKey
ALTER TABLE "ccpa_implementations" DROP CONSTRAINT "ccpa_implementations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "ce_marking_records" DROP CONSTRAINT "ce_marking_records_ai_system_id_fkey";

-- DropForeignKey
ALTER TABLE "ce_marking_records" DROP CONSTRAINT "ce_marking_records_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "dora_controls" DROP CONSTRAINT "dora_controls_section_id_fkey";

-- DropForeignKey
ALTER TABLE "dora_implementations" DROP CONSTRAINT "dora_implementations_control_id_fkey";

-- DropForeignKey
ALTER TABLE "dora_implementations" DROP CONSTRAINT "dora_implementations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "eu_ai_act_controls" DROP CONSTRAINT "eu_ai_act_controls_article_id_fkey";

-- DropForeignKey
ALTER TABLE "eu_ai_act_implementations" DROP CONSTRAINT "eu_ai_act_implementations_control_id_fkey";

-- DropForeignKey
ALTER TABLE "eu_ai_act_implementations" DROP CONSTRAINT "eu_ai_act_implementations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "fria_assessments" DROP CONSTRAINT "fria_assessments_ai_system_id_fkey";

-- DropForeignKey
ALTER TABLE "fria_assessments" DROP CONSTRAINT "fria_assessments_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "fria_responses" DROP CONSTRAINT "fria_responses_fria_id_fkey";

-- DropForeignKey
ALTER TABLE "ftc_controls" DROP CONSTRAINT "ftc_controls_section_id_fkey";

-- DropForeignKey
ALTER TABLE "ftc_implementations" DROP CONSTRAINT "ftc_implementations_control_id_fkey";

-- DropForeignKey
ALTER TABLE "ftc_implementations" DROP CONSTRAINT "ftc_implementations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "iso27001_controls" DROP CONSTRAINT "iso27001_controls_clause_id_fkey";

-- DropForeignKey
ALTER TABLE "iso27001_implementations" DROP CONSTRAINT "iso27001_implementations_control_id_fkey";

-- DropForeignKey
ALTER TABLE "iso27001_implementations" DROP CONSTRAINT "iso27001_implementations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "iso42001_controls" DROP CONSTRAINT "iso42001_controls_clause_id_fkey";

-- DropForeignKey
ALTER TABLE "iso42001_implementations" DROP CONSTRAINT "iso42001_implementations_control_id_fkey";

-- DropForeignKey
ALTER TABLE "iso42001_implementations" DROP CONSTRAINT "iso42001_implementations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "oecd_controls" DROP CONSTRAINT "oecd_controls_section_id_fkey";

-- DropForeignKey
ALTER TABLE "oecd_implementations" DROP CONSTRAINT "oecd_implementations_control_id_fkey";

-- DropForeignKey
ALTER TABLE "oecd_implementations" DROP CONSTRAINT "oecd_implementations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "soc2_chapters" DROP CONSTRAINT "soc2_chapters_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "soc2_controls" DROP CONSTRAINT "soc2_controls_chapter_id_fkey";

-- DropForeignKey
ALTER TABLE "soc2_controls" DROP CONSTRAINT "soc2_controls_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "soc2_implementations" DROP CONSTRAINT "soc2_implementations_control_id_fkey";

-- AlterTable
ALTER TABLE "compliance_snapshots" DROP COLUMN "eu_ai_act_score",
ADD COLUMN     "pci_dss_score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "governance_posture_snapshots" DROP COLUMN "eu_ai_act_score",
ADD COLUMN     "dpdp_score" DOUBLE PRECISION NOT NULL DEFAULT 100.0;

-- DropTable
DROP TABLE "ccpa_controls";

-- DropTable
DROP TABLE "ccpa_implementations";

-- DropTable
DROP TABLE "ccpa_sections";

-- DropTable
DROP TABLE "ce_marking_records";

-- DropTable
DROP TABLE "dora_controls";

-- DropTable
DROP TABLE "dora_implementations";

-- DropTable
DROP TABLE "dora_sections";

-- DropTable
DROP TABLE "eu_ai_act_articles";

-- DropTable
DROP TABLE "eu_ai_act_controls";

-- DropTable
DROP TABLE "eu_ai_act_implementations";

-- DropTable
DROP TABLE "fria_assessments";

-- DropTable
DROP TABLE "fria_responses";

-- DropTable
DROP TABLE "ftc_controls";

-- DropTable
DROP TABLE "ftc_implementations";

-- DropTable
DROP TABLE "ftc_sections";

-- DropTable
DROP TABLE "iso27001_clauses";

-- DropTable
DROP TABLE "iso27001_controls";

-- DropTable
DROP TABLE "iso27001_implementations";

-- DropTable
DROP TABLE "iso42001_clauses";

-- DropTable
DROP TABLE "iso42001_controls";

-- DropTable
DROP TABLE "iso42001_implementations";

-- DropTable
DROP TABLE "oecd_controls";

-- DropTable
DROP TABLE "oecd_implementations";

-- DropTable
DROP TABLE "oecd_sections";

-- DropTable
DROP TABLE "soc2_chapters";

-- DropTable
DROP TABLE "soc2_controls";

-- DropTable
DROP TABLE "soc2_implementations";

-- CreateTable
CREATE TABLE "guardrails" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardrails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "agent_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BLOCKED',
    "frameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_controls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    "framework" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jwt_blacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jwt_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guardrails_organization_id_idx" ON "guardrails"("organization_id");

-- CreateIndex
CREATE INDEX "block_events_organization_id_idx" ON "block_events"("organization_id");

-- CreateIndex
CREATE INDEX "compliance_controls_organization_id_idx" ON "compliance_controls"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "jwt_blacklist_token_key" ON "jwt_blacklist"("token");

-- CreateIndex
CREATE INDEX "jwt_blacklist_token_idx" ON "jwt_blacklist"("token");

-- AddForeignKey
ALTER TABLE "guardrails" ADD CONSTRAINT "guardrails_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_events" ADD CONSTRAINT "block_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_controls" ADD CONSTRAINT "compliance_controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_posture_findings" ADD CONSTRAINT "agent_posture_findings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_posture_findings" ADD CONSTRAINT "agent_posture_findings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
