import type { Asset } from "@/generated/prisma/enums";
import { calculateDailyIrrf, roundToCents } from "@/lib/trade-calculations";
import type { DailyAssetRow } from "@/lib/trades";

// Ganhos = soma dos pontos dos trades positivos; perdas = soma (em módulo) dos negativos.
export type PointsBreakdown = { gained: number; lost: number };

// Pontos de WIN e WDO têm valores diferentes, então nunca são somados entre si.
export type PointsByAsset = Partial<Record<Asset, PointsBreakdown>>;

export type DaySummary = {
  day: string;
  tradeCount: number;
  wins: number;
  winRate: number;
  pointsByAsset: PointsByAsset;
  contractsByAsset: Partial<Record<Asset, number>>;
  tradesByAsset: Partial<Record<Asset, number>>;
  // Bruto − taxas B3 de cada ativo (o IRRF é sobre o dia somado).
  resultByAsset: Partial<Record<Asset, number>>;
  grossResult: number;
  fees: number;
  operatingProfit: number;
  irrf: number;
  netResult: number;
  tradeProfit: number;
  tradeLoss: number;
};

export type PeriodSummary = {
  pointsByAsset: PointsByAsset;
  grossResult: number;
  fees: number;
  irrf: number;
  netResult: number;
  winRate: number;
  tradeCount: number;
  // Ganhos dos trades vencedores / perdas dos perdedores (após taxas B3). null = nenhum trade perdedor.
  profitFactor: number | null;
};

export function calculateProfitFactor(profit: number, loss: number) {
  return loss > 0 ? profit / loss : null;
}

function addPoints(target: PointsByAsset, asset: Asset, { gained, lost }: PointsBreakdown) {
  const current = (target[asset] ??= { gained: 0, lost: 0 });
  current.gained += gained;
  current.lost += lost;
}

function summarizeDay(day: string, rows: DailyAssetRow[]): DaySummary {
  const pointsByAsset: PointsByAsset = {};
  const contractsByAsset: DaySummary["contractsByAsset"] = {};
  const resultByAsset: DaySummary["resultByAsset"] = {};
  const tradesByAsset: DaySummary["tradesByAsset"] = {};
  let tradeCount = 0;
  let wins = 0;
  let gross = 0;
  let totalFees = 0;
  let tradeProfit = 0;
  let tradeLoss = 0;

  for (const row of rows) {
    addPoints(pointsByAsset, row.asset, { gained: row.pointsGained, lost: row.pointsLost });
    contractsByAsset[row.asset] = Math.max(contractsByAsset[row.asset] ?? 0, row.contracts);
    resultByAsset[row.asset] = roundToCents((resultByAsset[row.asset] ?? 0) + row.grossResult - row.fees);
    tradesByAsset[row.asset] = (tradesByAsset[row.asset] ?? 0) + row.tradeCount;
    tradeCount += row.tradeCount;
    wins += row.wins;
    gross += row.grossResult;
    totalFees += row.fees;
    tradeProfit += row.tradeProfit;
    tradeLoss += row.tradeLoss;
  }

  const grossResult = roundToCents(gross);
  const fees = roundToCents(totalFees);
  const operatingProfit = roundToCents(grossResult - fees);
  const irrf = calculateDailyIrrf(operatingProfit);

  return {
    day,
    tradeCount,
    wins,
    winRate: wins / tradeCount,
    pointsByAsset,
    contractsByAsset,
    tradesByAsset,
    resultByAsset,
    grossResult,
    fees,
    operatingProfit,
    irrf,
    netResult: roundToCents(operatingProfit - irrf),
    tradeProfit: roundToCents(tradeProfit),
    tradeLoss: roundToCents(tradeLoss),
  };
}

// Espera linhas ordenadas por dia desc (como vêm do banco) e mantém essa ordem.
export function buildDaySummaries(rows: DailyAssetRow[]): DaySummary[] {
  const groups = new Map<string, DailyAssetRow[]>();
  for (const row of rows) {
    const dayRows = groups.get(row.day);
    if (dayRows) dayRows.push(row);
    else groups.set(row.day, [row]);
  }
  return Array.from(groups, ([day, dayRows]) => summarizeDay(day, dayRows));
}

export type EquityPoint = { day: string; net: number; cumulative: number };

// Curva de capital: ordem cronológica, com o líquido do dia e o acumulado até ele.
export function buildEquityCurve(days: DaySummary[]): EquityPoint[] {
  let cumulative = 0;
  return [...days].reverse().map((day) => {
    cumulative = roundToCents(cumulative + day.netResult);
    return { day: day.day, net: day.netResult, cumulative };
  });
}

export function summarizePeriod(days: DaySummary[]): PeriodSummary {
  const sum = (pick: (day: DaySummary) => number) =>
    roundToCents(days.reduce((total, day) => total + pick(day), 0));
  const tradeCount = days.reduce((total, day) => total + day.tradeCount, 0);
  const wins = days.reduce((total, day) => total + day.wins, 0);

  const pointsByAsset: PointsByAsset = {};
  for (const day of days) {
    for (const [asset, points] of Object.entries(day.pointsByAsset) as [Asset, PointsBreakdown][]) {
      addPoints(pointsByAsset, asset, points);
    }
  }

  return {
    pointsByAsset,
    grossResult: sum((day) => day.grossResult),
    fees: sum((day) => day.fees),
    irrf: sum((day) => day.irrf),
    netResult: sum((day) => day.netResult),
    winRate: tradeCount > 0 ? wins / tradeCount : 0,
    tradeCount,
    profitFactor: calculateProfitFactor(sum((day) => day.tradeProfit), sum((day) => day.tradeLoss)),
  };
}
