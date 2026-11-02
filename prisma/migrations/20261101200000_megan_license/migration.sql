-- AlterTable: cache da licença da Megan (o acesso ao trade-manager segue a mesma regra do bot)
ALTER TABLE "User" ADD COLUMN "licenseOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "licensePlan" TEXT,
ADD COLUMN "licenseUntil" TIMESTAMP(3),
ADD COLUMN "licenseMessage" TEXT,
ADD COLUMN "licenseCheckedAt" TIMESTAMP(3);
