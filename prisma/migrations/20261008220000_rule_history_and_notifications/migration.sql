-- CreateTable
CREATE TABLE "NotificationSent" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationSent_pkey" PRIMARY KEY ("userId","key")
);

-- Mantém os stops já avisados para não reenviar o push
INSERT INTO "NotificationSent" ("userId", "key", "sentAt")
SELECT "userId", 'stop:' || "accountType"::text || ':' || to_char("date", 'YYYY-MM-DD'), "sentAt"
FROM "StopAlertSent";

-- DropForeignKey
ALTER TABLE "StopAlertSent" DROP CONSTRAINT "StopAlertSent_userId_fkey";

-- DropTable
DROP TABLE "StopAlertSent";

-- CreateTable
CREATE TABLE "RiskRuleVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "asset" "Asset" NOT NULL,
    "dailyGainTarget" INTEGER NOT NULL,
    "dailyStopLimit" INTEGER NOT NULL,
    "deviationTolerance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskRuleVersion_pkey" PRIMARY KEY ("id")
);

-- Versão inicial (vale para todo o histórico) a partir das configurações já salvas
INSERT INTO "RiskRuleVersion" ("id", "userId", "accountType", "effectiveFrom", "asset", "dailyGainTarget", "dailyStopLimit", "deviationTolerance")
SELECT gen_random_uuid()::text, "userId", "accountType", DATE '2000-01-01', "asset", "dailyGainTarget", "dailyStopLimit", "deviationTolerance"
FROM "RiskSettings";

-- CreateIndex
CREATE UNIQUE INDEX "RiskRuleVersion_userId_accountType_effectiveFrom_key" ON "RiskRuleVersion"("userId", "accountType", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "NotificationSent" ADD CONSTRAINT "NotificationSent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRuleVersion" ADD CONSTRAINT "RiskRuleVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
