-- AlterTable: id do trade na origem (Megan); trades lançados à mão ficam com null
ALTER TABLE "Trade" ADD COLUMN "externalId" TEXT;

-- CreateIndex: o mesmo trade da Megan não entra duas vezes para o mesmo usuário (null não conflita)
CREATE UNIQUE INDEX "Trade_userId_externalId_key" ON "Trade"("userId", "externalId");
