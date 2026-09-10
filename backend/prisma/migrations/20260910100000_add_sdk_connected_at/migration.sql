-- AlterTable
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "sdk_connected_at" TIMESTAMP(3);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "sdk_connected_at" TIMESTAMP(3);
  END IF;
END $$;
