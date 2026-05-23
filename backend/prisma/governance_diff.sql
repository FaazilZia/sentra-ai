-- AlterTable
ALTER TABLE "workflow_tasks" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "ai_systems" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model_name" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "use_case" TEXT NOT NULL,
    "risk_tier" TEXT NOT NULL DEFAULT 'MEDIUM',
    "owner_user_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ai_system_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessment_answers" (
    "id" TEXT NOT NULL,
    "risk_assessment_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "risk_assessment_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_assessments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "ai_system_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "form_data" JSONB NOT NULL,
    "submitted_by" TEXT,
    "reviewed_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impact_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_implementations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "owner_user_id" TEXT,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_ai_tools" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "tool_category" TEXT NOT NULL,
    "data_shared" JSONB NOT NULL,
    "risk_level" TEXT NOT NULL DEFAULT 'MEDIUM',
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewer_id" TEXT,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_ai_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_cards" (
    "id" TEXT NOT NULL,
    "ai_system_id" TEXT NOT NULL,
    "intended_use" TEXT NOT NULL,
    "out_of_scope_use" TEXT NOT NULL,
    "training_data_description" TEXT NOT NULL,
    "known_limitations" TEXT NOT NULL,
    "bias_considerations" TEXT NOT NULL,
    "performance_metrics" JSONB NOT NULL,
    "last_updated_by" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_obligations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "article_or_task" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "owner_user_id" TEXT,
    "deadline" TIMESTAMP(3),
    "linked_control_id" TEXT,

    CONSTRAINT "compliance_obligations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_systems_organization_id_idx" ON "ai_systems"("organization_id");

-- CreateIndex
CREATE INDEX "risk_assessments_organization_id_idx" ON "risk_assessments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_assessment_answers_risk_assessment_id_question_key_key" ON "risk_assessment_answers"("risk_assessment_id", "question_key");

-- CreateIndex
CREATE INDEX "impact_assessments_organization_id_idx" ON "impact_assessments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "controls_organization_id_framework_control_id_key" ON "controls"("organization_id", "framework", "control_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_implementations_organization_id_control_id_key" ON "control_implementations"("organization_id", "control_id");

-- CreateIndex
CREATE INDEX "vendor_ai_tools_organization_id_idx" ON "vendor_ai_tools"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_cards_ai_system_id_key" ON "model_cards"("ai_system_id");

-- CreateIndex
CREATE INDEX "compliance_obligations_organization_id_idx" ON "compliance_obligations"("organization_id");

-- AddForeignKey
ALTER TABLE "ai_systems" ADD CONSTRAINT "ai_systems_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_systems" ADD CONSTRAINT "ai_systems_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_ai_system_id_fkey" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessment_answers" ADD CONSTRAINT "risk_assessment_answers_risk_assessment_id_fkey" FOREIGN KEY ("risk_assessment_id") REFERENCES "risk_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impact_assessments" ADD CONSTRAINT "impact_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impact_assessments" ADD CONSTRAINT "impact_assessments_ai_system_id_fkey" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ai_tools" ADD CONSTRAINT "vendor_ai_tools_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_cards" ADD CONSTRAINT "model_cards_ai_system_id_fkey" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_obligations" ADD CONSTRAINT "compliance_obligations_linked_control_id_fkey" FOREIGN KEY ("linked_control_id") REFERENCES "controls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

