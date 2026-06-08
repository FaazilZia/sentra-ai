-- CreateTable
CREATE TABLE "gdpr_chapters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chapter_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gdpr_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_controls" (
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

    CONSTRAINT "gdpr_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_implementations" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gdpr_implementations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gdpr_chapters" ADD CONSTRAINT "gdpr_chapters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdpr_controls" ADD CONSTRAINT "gdpr_controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdpr_controls" ADD CONSTRAINT "gdpr_controls_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "gdpr_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdpr_implementations" ADD CONSTRAINT "gdpr_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "gdpr_controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
