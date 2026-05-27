-- CreateTable
CREATE TABLE "dora_sections" (
    "id" TEXT NOT NULL,
    "section_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "section_type" TEXT NOT NULL DEFAULT 'SECTION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dora_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dora_controls" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_required" TEXT[],
    "checklist_items" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dora_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dora_implementations" (
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

    CONSTRAINT "dora_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oecd_sections" (
    "id" TEXT NOT NULL,
    "section_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "section_type" TEXT NOT NULL DEFAULT 'SECTION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oecd_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oecd_controls" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_required" TEXT[],
    "checklist_items" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oecd_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oecd_implementations" (
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

    CONSTRAINT "oecd_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ftc_sections" (
    "id" TEXT NOT NULL,
    "section_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "section_type" TEXT NOT NULL DEFAULT 'SECTION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ftc_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ftc_controls" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "control_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_required" TEXT[],
    "checklist_items" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ftc_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ftc_implementations" (
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

    CONSTRAINT "ftc_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dora_sections_section_code_key" ON "dora_sections"("section_code");

-- CreateIndex
CREATE UNIQUE INDEX "dora_controls_control_code_key" ON "dora_controls"("control_code");

-- CreateIndex
CREATE UNIQUE INDEX "dora_implementations_organization_id_control_id_key" ON "dora_implementations"("organization_id", "control_id");

-- CreateIndex
CREATE UNIQUE INDEX "oecd_sections_section_code_key" ON "oecd_sections"("section_code");

-- CreateIndex
CREATE UNIQUE INDEX "oecd_controls_control_code_key" ON "oecd_controls"("control_code");

-- CreateIndex
CREATE UNIQUE INDEX "oecd_implementations_organization_id_control_id_key" ON "oecd_implementations"("organization_id", "control_id");

-- CreateIndex
CREATE UNIQUE INDEX "ftc_sections_section_code_key" ON "ftc_sections"("section_code");

-- CreateIndex
CREATE UNIQUE INDEX "ftc_controls_control_code_key" ON "ftc_controls"("control_code");

-- CreateIndex
CREATE UNIQUE INDEX "ftc_implementations_organization_id_control_id_key" ON "ftc_implementations"("organization_id", "control_id");

-- AddForeignKey
ALTER TABLE "dora_controls" ADD CONSTRAINT "dora_controls_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "dora_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dora_implementations" ADD CONSTRAINT "dora_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dora_implementations" ADD CONSTRAINT "dora_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "dora_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oecd_controls" ADD CONSTRAINT "oecd_controls_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "oecd_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oecd_implementations" ADD CONSTRAINT "oecd_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oecd_implementations" ADD CONSTRAINT "oecd_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "oecd_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ftc_controls" ADD CONSTRAINT "ftc_controls_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "ftc_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ftc_implementations" ADD CONSTRAINT "ftc_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ftc_implementations" ADD CONSTRAINT "ftc_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "ftc_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
