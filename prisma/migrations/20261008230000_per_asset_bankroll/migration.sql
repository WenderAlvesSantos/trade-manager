-- Configuração passa a ser por conta + ativo, com gestão de banca no lugar da escada por colchão.

-- DropIndex
DROP INDEX "ContractLevelChange_userId_accountType_createdAt_idx";
DROP INDEX "RiskRuleVersion_userId_accountType_effectiveFrom_key";
DROP INDEX "RiskSettings_userId_accountType_key";

-- Histórico de níveis ganha o ativo (herda o ativo da configuração da conta; WIN se não houver)
ALTER TABLE "ContractLevelChange" ADD COLUMN "asset" "Asset";
UPDATE "ContractLevelChange" AS c
SET "asset" = COALESCE(
  (SELECT s."asset" FROM "RiskSettings" s WHERE s."userId" = c."userId" AND s."accountType" = c."accountType"),
  'WIN'
);
ALTER TABLE "ContractLevelChange" ALTER COLUMN "asset" SET NOT NULL;

-- Banca: data de início = início do nível atual; margem do WIN = R$ 155 (WDO a informar)
ALTER TABLE "RiskSettings" DROP COLUMN "cushionDays",
DROP COLUMN "scaleStep",
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "bankrollStartDate" DATE,
ADD COLUMN "initialBankroll" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "marginPerContract" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "riskPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
ALTER COLUMN "asset" DROP DEFAULT;
UPDATE "RiskSettings" SET "bankrollStartDate" = "levelStartDate";
UPDATE "RiskSettings" SET "marginPerContract" = 155 WHERE "asset" = 'WIN';
ALTER TABLE "RiskSettings" ALTER COLUMN "bankrollStartDate" SET NOT NULL;

-- Chaves de aviso de stop passam a incluir o ativo
UPDATE "NotificationSent"
SET "key" = regexp_replace("key", '^stop:(SIMULADOR|REAL):', 'stop:\1:WIN:')
WHERE "key" ~ '^stop:(SIMULADOR|REAL):\d{4}-';

-- CreateIndex
CREATE INDEX "ContractLevelChange_userId_accountType_asset_createdAt_idx" ON "ContractLevelChange"("userId", "accountType", "asset", "createdAt");
CREATE UNIQUE INDEX "RiskRuleVersion_userId_accountType_asset_effectiveFrom_key" ON "RiskRuleVersion"("userId", "accountType", "asset", "effectiveFrom");
CREATE UNIQUE INDEX "RiskSettings_userId_accountType_asset_key" ON "RiskSettings"("userId", "accountType", "asset");
