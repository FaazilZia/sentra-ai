-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('alert', 'policy', 'risk', 'incident', 'workflow', 'drift');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('risk', 'policy', 'compliance', 'incident', 'guardrail');

-- CreateEnum
CREATE TYPE "ChangeEntityType" AS ENUM ('policy', 'risk', 'incident', 'guardrail', 'agent', 'compliance', 'workflow');

-- CreateEnum
CREATE TYPE "ChangeHistoryType" AS ENUM ('created', 'updated', 'deleted', 'status_changed', 'assigned');

-- CreateEnum
CREATE TYPE "IntakeSubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RiskScoreType" AS ENUM ('likelihood', 'impact', 'composite');

-- CreateEnum
CREATE TYPE "RiskScoredBy" AS ENUM ('system', 'manual');

-- CreateEnum
CREATE TYPE "ShareLinkResourceType" AS ENUM ('report', 'compliance', 'risk', 'audit');

-- AlterTable
ALTER TABLE "ai_systems" ADD COLUMN     "lifecycle_stage" TEXT NOT NULL DEFAULT 'DEVELOPMENT';

-- AlterTable
ALTER TABLE "compliance_snapshots" ADD COLUMN     "eu_ai_act_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "framework_version" TEXT NOT NULL DEFAULT '1.0.0',
ADD COLUMN     "governance_posture_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "nist_ai_rmf_score" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "entity_type" "EvidenceType" NOT NULL,
    "entity_id" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slack_config" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notify_on" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" "ChangeEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "change_type" "ChangeHistoryType" NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "change_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_forms" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_submissions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "submitted_by" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "agent_description" TEXT NOT NULL,
    "use_case" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "status" "IntakeSubmissionStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "review_note" TEXT,
    "form_data" JSONB NOT NULL,
    "llm_risk_score" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intake_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "score_type" "RiskScoreType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "previous_score" DOUBLE PRECISION,
    "scored_by" "RiskScoredBy" NOT NULL,
    "methodology" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "resource_type" "ShareLinkResourceType" NOT NULL,
    "resource_id" TEXT,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eu_ai_act_articles" (
    "id" TEXT NOT NULL,
    "article_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "risk_tier" TEXT NOT NULL,
    "obligation_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eu_ai_act_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eu_ai_act_controls" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_required" TEXT[],
    "checklist_items" TEXT[],
    "is_structural" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "eu_ai_act_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eu_ai_act_implementations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "evidence_links" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "owner_user_id" TEXT,
    "due_date" TIMESTAMP(3),
    "last_reviewed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eu_ai_act_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "framework_control_mappings" (
    "id" TEXT NOT NULL,
    "source_framework" TEXT NOT NULL,
    "source_control_code" TEXT NOT NULL,
    "target_framework" TEXT NOT NULL,
    "target_control_code" TEXT NOT NULL,
    "mapping_strength" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "framework_control_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_evidence" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "framework_version" TEXT NOT NULL DEFAULT '1.0.0',
    "evidence_type" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_reference" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "freshness_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "retention_class" TEXT NOT NULL DEFAULT 'TELEMETRY',
    "event_hash" TEXT,
    "deduplication_key" TEXT,
    "aggregate_count" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_evidence_id" TEXT,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "evidence_signature" TEXT,
    "signing_key_version" TEXT NOT NULL DEFAULT 'v1',
    "checksum" TEXT,
    "immutable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "governance_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_posture_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "governance_posture_score" DOUBLE PRECISION NOT NULL,
    "nist_ai_rmf_score" DOUBLE PRECISION NOT NULL,
    "eu_ai_act_score" DOUBLE PRECISION NOT NULL,
    "telemetry_coverage" DOUBLE PRECISION NOT NULL,
    "interception_coverage" DOUBLE PRECISION NOT NULL,
    "maturity_level" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_freshness_status" TEXT NOT NULL DEFAULT 'CURRENT',
    "reasons" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "governance_posture_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_incidents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "incident_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "related_frameworks" TEXT[],
    "related_controls" TEXT[],
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source_event_id" TEXT,
    "source_system" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "sla_deadline" TIMESTAMP(3),
    "sla_breach" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "governance_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_system_health" (
    "id" TEXT NOT NULL,
    "worker_name" TEXT NOT NULL,
    "queue_depth" INTEGER NOT NULL,
    "processing_latency_ms" INTEGER NOT NULL,
    "last_successful_run" TIMESTAMP(3),
    "last_failure" TIMESTAMP(3),
    "health_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governance_system_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nist_ai_rmf_functions" (
    "id" TEXT NOT NULL,
    "function_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nist_ai_rmf_functions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nist_ai_rmf_categories" (
    "id" TEXT NOT NULL,
    "function_id" TEXT NOT NULL,
    "category_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nist_ai_rmf_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nist_ai_rmf_subcategories" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "subcategory_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "implementation_examples" TEXT[],
    "suggested_evidence" TEXT[],
    "telemetry_sources" TEXT[],
    "severity_weight" INTEGER NOT NULL DEFAULT 5,
    "framework_version" TEXT NOT NULL DEFAULT '1.0.0',
    "depends_on_control" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nist_ai_rmf_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nist_ai_rmf_implementations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subcategory_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "maturity_level" INTEGER NOT NULL DEFAULT 1,
    "risk_escalation_level" TEXT NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "owner_user_id" TEXT,
    "due_date" TIMESTAMP(3),
    "last_reviewed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nist_ai_rmf_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fria_assessments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ai_system_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fria_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fria_responses" (
    "id" TEXT NOT NULL,
    "fria_id" TEXT NOT NULL,
    "question_code" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "risk_flag" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "fria_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_risk_assessments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "vendor_type" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" TEXT NOT NULL DEFAULT 'LOW',
    "data_access" TEXT[],
    "compliance_frameworks" TEXT[],
    "assessment_notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iso42001_clauses" (
    "id" TEXT NOT NULL,
    "clause_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clause_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "iso42001_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iso42001_controls" (
    "id" TEXT NOT NULL,
    "clause_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_required" TEXT[],
    "checklist_items" TEXT[],

    CONSTRAINT "iso42001_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iso42001_implementations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "due_date" TIMESTAMP(3),
    "last_reviewed" TIMESTAMP(3),

    CONSTRAINT "iso42001_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iso27001_clauses" (
    "id" TEXT NOT NULL,
    "clause_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "iso27001_clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iso27001_controls" (
    "id" TEXT NOT NULL,
    "clause_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_required" TEXT[],
    "checklist_items" TEXT[],

    CONSTRAINT "iso27001_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iso27001_implementations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "due_date" TIMESTAMP(3),
    "last_reviewed" TIMESTAMP(3),

    CONSTRAINT "iso27001_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "control_type" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger_type" TEXT NOT NULL,
    "trigger_config" JSONB NOT NULL,
    "action_type" TEXT NOT NULL,
    "action_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_execution_logs" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "output" TEXT,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataset_type" TEXT NOT NULL,
    "data_classification" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "source_url" TEXT,
    "ai_system_id" TEXT,
    "record_count" INTEGER,
    "last_updated" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_tags" (
    "id" TEXT NOT NULL,
    "dataset_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "dataset_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_lifecycle_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ai_system_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "notes" TEXT,
    "changed_by" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_courses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "framework_tags" TEXT[],
    "duration_minutes" INTEGER NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_completions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "training_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_agent_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "allowed_tools" TEXT[],
    "blocked_tools" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_agent_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_key_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "input_summary" TEXT,
    "decision" TEXT NOT NULL,
    "risk_level" TEXT,
    "reason" TEXT,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ce_marking_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ai_system_id" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'LIMITED_RISK',
    "scope_notes" TEXT,
    "step1_conformity_assessment" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step2_technical_documentation" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step3_quality_management" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step4_declaration_of_conformity" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step5_eu_database_registration" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step6_ce_mark_affixing" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step7_post_market_monitoring" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "step1_notes" TEXT,
    "step2_notes" TEXT,
    "step3_notes" TEXT,
    "step4_notes" TEXT,
    "step5_notes" TEXT,
    "step6_notes" TEXT,
    "step7_notes" TEXT,
    "overall_status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "certified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ce_marking_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ccpa_sections" (
    "id" TEXT NOT NULL,
    "section_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "section_type" TEXT NOT NULL DEFAULT 'SECTION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ccpa_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ccpa_controls" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_required" TEXT[],
    "checklist_items" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ccpa_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ccpa_implementations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "owner_user_id" TEXT,
    "due_date" TIMESTAMP(3),
    "evidence_links" JSONB NOT NULL DEFAULT '[]',
    "last_reviewed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ccpa_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");

-- CreateIndex
CREATE INDEX "evidence_organization_id_idx" ON "evidence"("organization_id");

-- CreateIndex
CREATE INDEX "evidence_uploaded_by_idx" ON "evidence"("uploaded_by");

-- CreateIndex
CREATE UNIQUE INDEX "slack_config_organization_id_key" ON "slack_config"("organization_id");

-- CreateIndex
CREATE INDEX "slack_config_organization_id_idx" ON "slack_config"("organization_id");

-- CreateIndex
CREATE INDEX "change_history_organization_id_idx" ON "change_history"("organization_id");

-- CreateIndex
CREATE INDEX "change_history_changed_by_idx" ON "change_history"("changed_by");

-- CreateIndex
CREATE INDEX "change_history_entity_type_entity_id_idx" ON "change_history"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "intake_forms_organization_id_idx" ON "intake_forms"("organization_id");

-- CreateIndex
CREATE INDEX "intake_submissions_organization_id_idx" ON "intake_submissions"("organization_id");

-- CreateIndex
CREATE INDEX "intake_submissions_form_id_idx" ON "intake_submissions"("form_id");

-- CreateIndex
CREATE INDEX "intake_submissions_submitted_by_idx" ON "intake_submissions"("submitted_by");

-- CreateIndex
CREATE INDEX "risk_scores_organization_id_idx" ON "risk_scores"("organization_id");

-- CreateIndex
CREATE INDEX "risk_scores_agent_id_idx" ON "risk_scores"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_organization_id_idx" ON "share_links"("organization_id");

-- CreateIndex
CREATE INDEX "share_links_token_idx" ON "share_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "eu_ai_act_articles_article_number_key" ON "eu_ai_act_articles"("article_number");

-- CreateIndex
CREATE UNIQUE INDEX "eu_ai_act_controls_control_code_key" ON "eu_ai_act_controls"("control_code");

-- CreateIndex
CREATE INDEX "eu_ai_act_implementations_organization_id_idx" ON "eu_ai_act_implementations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "eu_ai_act_implementations_organization_id_control_id_key" ON "eu_ai_act_implementations"("organization_id", "control_id");

-- CreateIndex
CREATE INDEX "framework_control_mappings_source_framework_source_control__idx" ON "framework_control_mappings"("source_framework", "source_control_code");

-- CreateIndex
CREATE INDEX "framework_control_mappings_target_framework_target_control__idx" ON "framework_control_mappings"("target_framework", "target_control_code");

-- CreateIndex
CREATE INDEX "governance_evidence_organization_id_idx" ON "governance_evidence"("organization_id");

-- CreateIndex
CREATE INDEX "governance_evidence_framework_idx" ON "governance_evidence"("framework");

-- CreateIndex
CREATE INDEX "governance_evidence_control_code_idx" ON "governance_evidence"("control_code");

-- CreateIndex
CREATE INDEX "governance_evidence_event_hash_idx" ON "governance_evidence"("event_hash");

-- CreateIndex
CREATE INDEX "governance_evidence_deduplication_key_idx" ON "governance_evidence"("deduplication_key");

-- CreateIndex
CREATE INDEX "governance_posture_snapshots_organization_id_snapshot_date_idx" ON "governance_posture_snapshots"("organization_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "governance_incidents_organization_id_idx" ON "governance_incidents"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "nist_ai_rmf_functions_function_code_key" ON "nist_ai_rmf_functions"("function_code");

-- CreateIndex
CREATE UNIQUE INDEX "nist_ai_rmf_categories_category_code_key" ON "nist_ai_rmf_categories"("category_code");

-- CreateIndex
CREATE UNIQUE INDEX "nist_ai_rmf_subcategories_subcategory_code_key" ON "nist_ai_rmf_subcategories"("subcategory_code");

-- CreateIndex
CREATE INDEX "nist_ai_rmf_implementations_organization_id_idx" ON "nist_ai_rmf_implementations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "nist_ai_rmf_implementations_organization_id_subcategory_id_key" ON "nist_ai_rmf_implementations"("organization_id", "subcategory_id");

-- CreateIndex
CREATE INDEX "fria_assessments_organization_id_idx" ON "fria_assessments"("organization_id");

-- CreateIndex
CREATE INDEX "fria_assessments_ai_system_id_idx" ON "fria_assessments"("ai_system_id");

-- CreateIndex
CREATE UNIQUE INDEX "fria_responses_fria_id_question_code_key" ON "fria_responses"("fria_id", "question_code");

-- CreateIndex
CREATE INDEX "vendor_risk_assessments_organization_id_idx" ON "vendor_risk_assessments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "iso42001_clauses_clause_code_key" ON "iso42001_clauses"("clause_code");

-- CreateIndex
CREATE UNIQUE INDEX "iso42001_controls_control_code_key" ON "iso42001_controls"("control_code");

-- CreateIndex
CREATE INDEX "iso42001_implementations_organization_id_idx" ON "iso42001_implementations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "iso42001_implementations_organization_id_control_id_key" ON "iso42001_implementations"("organization_id", "control_id");

-- CreateIndex
CREATE UNIQUE INDEX "iso27001_clauses_clause_code_key" ON "iso27001_clauses"("clause_code");

-- CreateIndex
CREATE UNIQUE INDEX "iso27001_controls_control_code_key" ON "iso27001_controls"("control_code");

-- CreateIndex
CREATE INDEX "iso27001_implementations_organization_id_idx" ON "iso27001_implementations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "iso27001_implementations_organization_id_control_id_key" ON "iso27001_implementations"("organization_id", "control_id");

-- CreateIndex
CREATE INDEX "evidence_files_organization_id_idx" ON "evidence_files"("organization_id");

-- CreateIndex
CREATE INDEX "mcp_audit_logs_organization_id_idx" ON "mcp_audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "mcp_audit_logs_created_at_idx" ON "mcp_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "ce_marking_records_organization_id_idx" ON "ce_marking_records"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "ce_marking_records_organization_id_ai_system_id_key" ON "ce_marking_records"("organization_id", "ai_system_id");

-- CreateIndex
CREATE UNIQUE INDEX "ccpa_sections_section_code_key" ON "ccpa_sections"("section_code");

-- CreateIndex
CREATE UNIQUE INDEX "ccpa_controls_control_code_key" ON "ccpa_controls"("control_code");

-- CreateIndex
CREATE UNIQUE INDEX "ccpa_implementations_organization_id_control_id_key" ON "ccpa_implementations"("organization_id", "control_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slack_config" ADD CONSTRAINT "slack_config_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_history" ADD CONSTRAINT "change_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_history" ADD CONSTRAINT "change_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_forms" ADD CONSTRAINT "intake_forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "intake_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eu_ai_act_controls" ADD CONSTRAINT "eu_ai_act_controls_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "eu_ai_act_articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eu_ai_act_implementations" ADD CONSTRAINT "eu_ai_act_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eu_ai_act_implementations" ADD CONSTRAINT "eu_ai_act_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "eu_ai_act_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_evidence" ADD CONSTRAINT "governance_evidence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_posture_snapshots" ADD CONSTRAINT "governance_posture_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "governance_incidents" ADD CONSTRAINT "governance_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nist_ai_rmf_categories" ADD CONSTRAINT "nist_ai_rmf_categories_function_id_fkey" FOREIGN KEY ("function_id") REFERENCES "nist_ai_rmf_functions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nist_ai_rmf_subcategories" ADD CONSTRAINT "nist_ai_rmf_subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "nist_ai_rmf_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nist_ai_rmf_implementations" ADD CONSTRAINT "nist_ai_rmf_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nist_ai_rmf_implementations" ADD CONSTRAINT "nist_ai_rmf_implementations_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "nist_ai_rmf_subcategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fria_assessments" ADD CONSTRAINT "fria_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fria_assessments" ADD CONSTRAINT "fria_assessments_ai_system_id_fkey" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fria_responses" ADD CONSTRAINT "fria_responses_fria_id_fkey" FOREIGN KEY ("fria_id") REFERENCES "fria_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_risk_assessments" ADD CONSTRAINT "vendor_risk_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iso42001_controls" ADD CONSTRAINT "iso42001_controls_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "iso42001_clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iso42001_implementations" ADD CONSTRAINT "iso42001_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iso42001_implementations" ADD CONSTRAINT "iso42001_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "iso42001_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iso27001_controls" ADD CONSTRAINT "iso27001_controls_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "iso27001_clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iso27001_implementations" ADD CONSTRAINT "iso27001_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iso27001_implementations" ADD CONSTRAINT "iso27001_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "iso27001_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_conversations" ADD CONSTRAINT "advisor_conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_execution_logs" ADD CONSTRAINT "automation_execution_logs_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_ai_system_id_fkey" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_tags" ADD CONSTRAINT "dataset_tags_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_lifecycle_events" ADD CONSTRAINT "model_lifecycle_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_lifecycle_events" ADD CONSTRAINT "model_lifecycle_events_ai_system_id_fkey" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_courses" ADD CONSTRAINT "training_courses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "training_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_completions" ADD CONSTRAINT "training_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_agent_keys" ADD CONSTRAINT "mcp_agent_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_audit_logs" ADD CONSTRAINT "mcp_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ce_marking_records" ADD CONSTRAINT "ce_marking_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ce_marking_records" ADD CONSTRAINT "ce_marking_records_ai_system_id_fkey" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccpa_controls" ADD CONSTRAINT "ccpa_controls_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "ccpa_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccpa_implementations" ADD CONSTRAINT "ccpa_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ccpa_implementations" ADD CONSTRAINT "ccpa_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "ccpa_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
