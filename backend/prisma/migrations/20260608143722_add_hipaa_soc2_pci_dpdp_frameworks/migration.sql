-- CreateTable
CREATE TABLE "hipaa_chapters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hipaa_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hipaa_controls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "article_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hipaa_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hipaa_implementations" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hipaa_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soc2_chapters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soc2_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soc2_controls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "article_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soc2_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soc2_implementations" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "soc2_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pci_chapters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pci_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pci_controls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "article_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pci_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pci_implementations" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pci_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dpdp_chapters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dpdp_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dpdp_controls" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "article_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "requirement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dpdp_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dpdp_implementations" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dpdp_implementations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "hipaa_chapters" ADD CONSTRAINT "hipaa_chapters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hipaa_controls" ADD CONSTRAINT "hipaa_controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hipaa_controls" ADD CONSTRAINT "hipaa_controls_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "hipaa_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hipaa_implementations" ADD CONSTRAINT "hipaa_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "hipaa_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soc2_chapters" ADD CONSTRAINT "soc2_chapters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soc2_controls" ADD CONSTRAINT "soc2_controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soc2_controls" ADD CONSTRAINT "soc2_controls_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "soc2_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soc2_implementations" ADD CONSTRAINT "soc2_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "soc2_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pci_chapters" ADD CONSTRAINT "pci_chapters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pci_controls" ADD CONSTRAINT "pci_controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pci_controls" ADD CONSTRAINT "pci_controls_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "pci_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pci_implementations" ADD CONSTRAINT "pci_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "pci_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dpdp_chapters" ADD CONSTRAINT "dpdp_chapters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dpdp_controls" ADD CONSTRAINT "dpdp_controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dpdp_controls" ADD CONSTRAINT "dpdp_controls_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "dpdp_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dpdp_implementations" ADD CONSTRAINT "dpdp_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "dpdp_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
