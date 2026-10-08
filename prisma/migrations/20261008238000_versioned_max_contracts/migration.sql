-- AlterTable
ALTER TABLE "RiskRuleVersion" ADD COLUMN "maxContracts" INTEGER NOT NULL DEFAULT 0;

-- Backfill: versões existentes herdam o máximo atual da configuração da conta + ativo
UPDATE "RiskRuleVersion" AS v
SET "maxContracts" = s."maxContracts"
FROM "RiskSettings" AS s
WHERE s."userId" = v."userId" AND s."accountType" = v."accountType" AND s."asset" = v."asset";
