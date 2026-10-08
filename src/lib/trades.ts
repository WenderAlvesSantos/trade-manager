import { prisma } from "@/lib/prisma";

export type TradeSummary = {
  grossTotal: number;
  costsTotal: number;
  netTotal: number;
  winRate: number;
  tradeCount: number;
};

export function getUserTrades(userId: string) {
  return prisma.trade.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function getUserTradeSummary(
  userId: string,
): Promise<TradeSummary> {
  const [totals, winningTrades] = await Promise.all([
    prisma.trade.aggregate({
      where: { userId },
      _sum: { grossResult: true, fees: true, taxes: true, netResult: true },
      _count: true,
    }),
    prisma.trade.count({ where: { userId, netResult: { gt: 0 } } }),
  ]);

  const tradeCount = totals._count;
  const sum = totals._sum;

  return {
    grossTotal: sum.grossResult ?? 0,
    costsTotal: (sum.fees ?? 0) + (sum.taxes ?? 0),
    netTotal: sum.netResult ?? 0,
    winRate: tradeCount > 0 ? winningTrades / tradeCount : 0,
    tradeCount,
  };
}
