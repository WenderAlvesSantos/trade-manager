-- AlterTable
ALTER TABLE "RiskSettings" ADD COLUMN "increaseBuffer" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RiskRuleVersion" ADD COLUMN "increaseBuffer" INTEGER NOT NULL DEFAULT 0;
