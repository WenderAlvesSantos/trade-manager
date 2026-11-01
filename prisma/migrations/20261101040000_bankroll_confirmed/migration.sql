-- AlterTable: banca inicial confirmada pelo usuário (a Megan pede a confirmação na primeira utilização)
ALTER TABLE "RiskSettings" ADD COLUMN "bankrollConfirmedAt" TIMESTAMP(3);

-- Quem já tinha banca informada (pela Megan ou pela tela de configuração) já confirmou o valor
UPDATE "RiskSettings" SET "bankrollConfirmedAt" = "updatedAt" WHERE "initialBankroll" > 0;
