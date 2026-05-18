/*
  Warnings:

  - You are about to drop the column `organizationId` on the `alerts` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `monitoring_status` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `outcome_validations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_agents" ADD COLUMN     "baselineActions" TEXT[],
ADD COLUMN     "baselineDataScopes" TEXT[],
ADD COLUMN     "baselineSampledAt" TIMESTAMP(3),
ADD COLUMN     "riskThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.3;

-- AlterTable
ALTER TABLE "alerts" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "drift_alerts" ADD COLUMN     "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "driftScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "unexpectedActions" TEXT[];

-- AlterTable
ALTER TABLE "monitoring_status" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "outcome_validations" DROP COLUMN "organizationId";
