-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SIMULADOR', 'REAL');

-- AlterTable: trades existentes passam a ser SIMULADOR; o default é removido em seguida
ALTER TABLE "Trade" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'SIMULADOR';
ALTER TABLE "Trade" ALTER COLUMN "accountType" DROP DEFAULT;

-- IRRF e líquido passam a ser calculados por dia, não por trade
ALTER TABLE "Trade" DROP COLUMN "netResult",
DROP COLUMN "taxes";

-- Recalcula custos B3 com a nova tabela (WIN R$ 0,48 | WDO R$ 2,40 por contrato)
UPDATE "Trade"
SET "fees" = ROUND(("contracts" * CASE "asset" WHEN 'WIN' THEN 0.48 ELSE 2.40 END)::numeric, 2);

-- CreateIndex
CREATE INDEX "Trade_userId_accountType_date_idx" ON "Trade"("userId", "accountType", "date");
