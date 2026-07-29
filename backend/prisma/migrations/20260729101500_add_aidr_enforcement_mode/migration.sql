-- AlterTable
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "aidr_enforcement_mode" TEXT NOT NULL DEFAULT 'BLOCK';

-- AlterTable
ALTER TABLE "block_events" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'BLOCK';
