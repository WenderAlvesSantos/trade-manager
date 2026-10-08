import type { Trade } from "@/generated/prisma/client";
import type { Asset } from "@/generated/prisma/enums";
import { calculateDailyIrrf, roundToCents } from "@/lib/trade-calculations";

export type DaySummary = {
  day: string;
  trades: Trade[];
  tradeCount: number;
  wins: number;
  winRate: number;
  pointsByAsset: Partial<Record<Asset, number>>;
  grossResult: number;
  fees: number;
  operatingProfit: number;
  irrf: number;
  netResult: number;
};

export type PointsBreakdown = { gained: number; lost: number };

export type PeriodSummary = {
  pointsByAsset: Partial<Record<Asset, PointsBreakdown>>;
  grossResult: number;
  fees: number;
  irrf: number;
  netResult: number;
  winRate: number;
  tradeCount: number;
};

const isWinningTrade = (trade: Trade) => trade.grossResult - trade.fees > 0;

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

// Pontos de WIN e WDO têm valores diferentes, então não são somados entre si.
function sumPointsByAsset(trades: Trade[]) {
  const totals: Partial<Record<Asset, number>> = {};
  for (const { asset, points } of trades) {
    totals[asset] = (totals[asset] ?? 0) + points;
  }
  return totals;
}

// Ganhos = soma dos pontos dos trades positivos; perdas = soma (em módulo) dos negativos.
function breakdownPointsByAsset(trades: Trade[]) {
  const totals: Partial<Record<Asset, PointsBreakdown>> = {};
  for (const { asset, points } of trades) {
    const current = (totals[asset] ??= { gained: 0, lost: 0 });
    if (points > 0) current.gained += points;
    else current.lost += Math.abs(points);
  }
  return totals;
}

function summarizeDay(day: string, trades: Trade[]): DaySummary {
  const grossResult = roundToCents(trades.reduce((sum, t) => sum + t.grossResult, 0));
  const fees = roundToCents(trades.reduce((sum, t) => sum + t.fees, 0));
  const operatingProfit = roundToCents(grossResult - fees);
  const irrf = calculateDailyIrrf(operatingProfit);
  const wins = trades.filter(isWinningTrade).length;

  return {
    day,
    trades,
    tradeCount: trades.length,
    wins,
    winRate: wins / trades.length,
    pointsByAsset: sumPointsByAsset(trades),
    grossResult,
    fees,
    operatingProfit,
    irrf,
    netResult: roundToCents(operatingProfit - irrf),
  };
}

// Espera trades já ordenados por data desc; mantém essa ordem nos grupos.
export function groupTradesByDay(trades: Trade[]): DaySummary[] {
  const groups = new Map<string, Trade[]>();
  for (const trade of trades) {
    const key = dayKey(trade.date);
    const dayTrades = groups.get(key);
    if (dayTrades) dayTrades.push(trade);
    else groups.set(key, [trade]);
  }
  return Array.from(groups, ([day, dayTrades]) => summarizeDay(day, dayTrades));
}

export function summarizePeriod(days: DaySummary[]): PeriodSummary {
  const sum = (pick: (day: DaySummary) => number) =>
    roundToCents(days.reduce((total, day) => total + pick(day), 0));
  const tradeCount = days.reduce((total, day) => total + day.tradeCount, 0);
  const wins = days.reduce((total, day) => total + day.wins, 0);

  return {
    pointsByAsset: breakdownPointsByAsset(days.flatMap((day) => day.trades)),
    grossResult: sum((day) => day.grossResult),
    fees: sum((day) => day.fees),
    irrf: sum((day) => day.irrf),
    netResult: sum((day) => day.netResult),
    winRate: tradeCount > 0 ? wins / tradeCount : 0,
    tradeCount,
  };
}
