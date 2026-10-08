-- CreateTable
CREATE TABLE "RiskSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "asset" "Asset" NOT NULL DEFAULT 'WIN',
    "contracts" INTEGER NOT NULL,
    "dailyGainTarget" INTEGER NOT NULL,
    "dailyStopLimit" INTEGER NOT NULL,
    "tradeTarget" INTEGER NOT NULL,
    "tradeStop" INTEGER NOT NULL,
    "projectedGainDay" DOUBLE PRECISION NOT NULL,
    "projectedLossDay" DOUBLE PRECISION NOT NULL,
    "avgTradesPerDay" INTEGER NOT NULL,
    "scaleStep" INTEGER NOT NULL,
    "cushionDays" INTEGER NOT NULL,
    "levelStartDate" DATE NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiskSettings_userId_accountType_key" ON "RiskSettings"("userId", "accountType");

-- AddForeignKey
ALTER TABLE "RiskSettings" ADD CONSTRAINT "RiskSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
