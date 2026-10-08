import { prisma } from "@/lib/prisma";
import type { TradeFilters } from "@/lib/trade-filters";

// Sempre escopado ao userId da sessão; filtros de conta/período são aplicados no banco (índices em userId).
export function getUserTrades(userId: string, { account, from, to }: TradeFilters) {
  return prisma.trade.findMany({
    where: {
      userId,
      ...(account && { accountType: account }),
      ...((from || to) && {
        date: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}
