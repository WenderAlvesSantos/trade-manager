import type { Prisma } from "@/generated/prisma/client";
import type { AccountType, Asset, LevelChangeReason } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { buildDaySummaries } from "@/lib/trade-aggregations";
import { roundToCents } from "@/lib/trade-calculations";
import { getDailyAssetTotals } from "@/lib/trades";

// Líquido real (com IRRF diário) de uma conta + ativo desde uma data, a partir dos totais por dia do banco.
export async function netSince(userId: string, account: AccountType, asset: Asset, from: string) {
  const days = buildDaySummaries(await getDailyAssetTotals(userId, { account, asset, from }));
  return roundToCents(days.reduce((sum, day) => sum + day.netResult, 0));
}

export type LevelChange = {
  date: string;
  fromContracts: number;
  toContracts: number;
  reason: LevelChangeReason;
  previousLevelStart: string;
};

export const reasonFor = (from: number, to: number, manual: boolean): LevelChangeReason =>
  manual ? "MANUAL" : to > from ? "SUBIDA" : "REBAIXAMENTO";

type SettingsData = Omit<Parameters<typeof prisma.riskSettings.create>[0]["data"], "userId" | "accountType" | "asset" | "user">;

// Grava a configuração e, se houver mudança de contratos, o registro no histórico (mesma transação).
// `extraWrites` entra na mesma transação (ex.: versões de regra).
export async function saveSettingsWithHistory(
  userId: string,
  account: AccountType,
  asset: Asset,
  data: SettingsData,
  change: LevelChange | null,
  extraWrites: Prisma.PrismaPromise<unknown>[] = [],
) {
  const netSinceLevelStart = change ? await netSince(userId, account, asset, change.previousLevelStart) : 0;
  const key = { userId, accountType: account, asset };

  await prisma.$transaction([
    prisma.riskSettings.upsert({
      where: { userId_accountType_asset: key },
      create: { ...data, ...key },
      update: data,
    }),
    ...(change
      ? [
          prisma.contractLevelChange.create({
            data: {
              ...key,
              date: new Date(change.date),
              fromContracts: change.fromContracts,
              toContracts: change.toContracts,
              reason: change.reason,
              netSinceLevelStart,
            },
          }),
        ]
      : []),
    ...extraWrites,
  ]);
}

export function getLevelHistory(userId: string, account: AccountType, asset: Asset, take = 50) {
  return prisma.contractLevelChange.findMany({
    where: { userId, accountType: account, asset },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, date: true, fromContracts: true, toContracts: true, reason: true, netSinceLevelStart: true },
  });
}

export type LevelHistoryEntry = Awaited<ReturnType<typeof getLevelHistory>>[number];
