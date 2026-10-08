-- AlterTable
ALTER TABLE "RiskRuleVersion" ADD COLUMN "riskPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
ADD COLUMN "marginPerContract" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "drawdownLimit" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- Backfill: versões existentes herdam o dimensionamento atual da configuração da conta + ativo
UPDATE "RiskRuleVersion" AS v
SET "riskPercent" = s."riskPercent",
    "marginPerContract" = s."marginPerContract",
    "drawdownLimit" = s."drawdownLimit"
FROM "RiskSettings" AS s
WHERE s."userId" = v."userId" AND s."accountType" = v."accountType" AND s."asset" = v."asset";
