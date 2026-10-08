import { Prisma } from "@/generated/prisma/client";
import type { AccountType, Asset } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { TradeFilters } from "@/lib/trade-filters";

const DAY_TRADE_FIELDS = {
  id: true,
  asset: true,
  accountType: true,
  contracts: true,
  points: true,
  grossResult: true,
  fees: true,
} as const;

// Sempre escopado ao userId da sessão; usa o índice (userId, accountType, date) ou (userId, date).
export function getDayTrades(userId: string, day: string, { account, asset }: Pick<TradeFilters, "account" | "asset"> = {}) {
  return prisma.trade.findMany({
    where: { userId, date: new Date(day), ...(account && { accountType: account }), ...(asset && { asset }) },
    select: DAY_TRADE_FIELDS,
    // Lançamentos em lote podem ter o mesmo createdAt; o id (cuid, crescente) desempata na ordem de inserção.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export type DayTrade = Awaited<ReturnType<typeof getDayTrades>>[number];

export type DailyAssetRow = {
  day: string;
  asset: Asset;
  tradeCount: number;
  wins: number;
  grossResult: number;
  fees: number;
  pointsGained: number;
  pointsLost: number;
  // Soma dos resultados (bruto - taxas B3) dos trades positivos e, em módulo, dos negativos.
  tradeProfit: number;
  tradeLoss: number;
};

// Data mais antiga entre os últimos `days` dias operados da conta no ativo (base da média móvel); null sem histórico.
export async function oldestOfLatestTradingDays(userId: string, account: AccountType, asset: Asset, days: number) {
  const rows = await prisma.$queryRaw<{ day: string }[]>`
    SELECT DISTINCT to_char("date", 'YYYY-MM-DD') AS "day"
    FROM "Trade"
    WHERE "userId" = ${userId} AND "accountType" = ${account}::"AccountType" AND "asset" = ${asset}::"Asset"
    ORDER BY "day" DESC
    LIMIT ${days}
  `;
  return rows.at(-1)?.day ?? null;
}

// Totais por dia e ativo calculados no banco: o volume retornado cresce com os dias operados, não com os trades.
export function getDailyAssetTotals(userId: string, { account, from, to, asset }: TradeFilters) {
  const accountFilter = account ? Prisma.sql`AND "accountType" = ${account}::"AccountType"` : Prisma.empty;
  const assetFilter = asset ? Prisma.sql`AND "asset" = ${asset}::"Asset"` : Prisma.empty;
  const fromFilter = from ? Prisma.sql`AND "date" >= ${from}::date` : Prisma.empty;
  const toFilter = to ? Prisma.sql`AND "date" <= ${to}::date` : Prisma.empty;

  return prisma.$queryRaw<DailyAssetRow[]>`
    SELECT
      to_char("date", 'YYYY-MM-DD') AS "day",
      "asset"::text AS "asset",
      COUNT(*)::int AS "tradeCount",
      (COUNT(*) FILTER (WHERE "grossResult" - "fees" > 0))::int AS "wins",
      SUM("grossResult")::float8 AS "grossResult",
      SUM("fees")::float8 AS "fees",
      ROUND(SUM(GREATEST("points", 0))::numeric, 2)::float8 AS "pointsGained",
      ROUND(SUM(GREATEST(-"points", 0))::numeric, 2)::float8 AS "pointsLost",
      SUM(GREATEST("grossResult" - "fees", 0))::float8 AS "tradeProfit",
      SUM(GREATEST("fees" - "grossResult", 0))::float8 AS "tradeLoss"
    FROM "Trade"
    WHERE "userId" = ${userId} ${accountFilter} ${assetFilter} ${fromFilter} ${toFilter}
    GROUP BY "date", "asset"
    ORDER BY "date" DESC, "asset"
  `;
}
