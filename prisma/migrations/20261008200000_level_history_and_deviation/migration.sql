-- CreateEnum
CREATE TYPE "LevelChangeReason" AS ENUM ('SUBIDA', 'REBAIXAMENTO', 'MANUAL');

-- AlterTable
ALTER TABLE "RiskSettings" ADD COLUMN "deviationTolerance" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "ContractLevelChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "date" DATE NOT NULL,
    "fromContracts" INTEGER NOT NULL,
    "toContracts" INTEGER NOT NULL,
    "reason" "LevelChangeReason" NOT NULL,
    "netSinceLevelStart" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractLevelChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractLevelChange_userId_accountType_createdAt_idx" ON "ContractLevelChange"("userId", "accountType", "createdAt");

-- AddForeignKey
ALTER TABLE "ContractLevelChange" ADD CONSTRAINT "ContractLevelChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
