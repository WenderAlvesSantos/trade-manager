import type { AccountType } from "@/generated/prisma/enums";
import { businessDaysOfMonth, monthRange, pendingBusinessDays } from "@/lib/b3-calendar";
import { bankrollLevels } from "@/lib/bankroll-sizing";
import { loadBankrollAnalysis } from "@/lib/bankroll";
import { classifyDay, countDeviations } from "@/lib/day-deviation";
import { getLevelHistory, type LevelHistoryEntry } from "@/lib/level-history";
import {
  breakEvenLossDays,
  MOVING_AVERAGE_DAYS,
  projectMonth,
  projectMonthAtAverage,
  type AverageProjection,
} from "@/lib/risk-projection";
import { unitAsset, type SizingUnit } from "@/lib/sizing-unit";
import { buildDaySummaries } from "@/lib/trade-aggregations";
import { getDailyAssetTotals, oldestOfLatestTradingDays } from "@/lib/trades";

export const LOSS_DAY_SCENARIOS = [2, 3, 4] as const;

export type AverageScenarioKey = "media" | "movel";
export type AverageScenario = { key: AverageScenarioKey; label: string; projection: AverageProjection };

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export type ContractChange = { day: string; from: number; to: number };

// Mudanças de contratos desde o início da banca, em ordem cronológica. Com vários ativos, a mesma mudança
// registrada em cada um aparece uma vez.
function contractChangesSince(histories: LevelHistoryEntry[][], from: string): ContractChange[] {
  const changes = histories
    .flat()
    .map((entry) => ({ day: entry.date.toISOString().slice(0, 10), from: entry.fromContracts, to: entry.toContracts }))
    .filter((change) => change.day >= from);
  const unique = new Map(changes.map((change) => [`${change.day}:${change.from}:${change.to}`, change]));
  return [...unique.values()].sort((a, b) => a.day.localeCompare(b.day));
}

async function movingAverageNets(userId: string, account: AccountType, unit: SizingUnit) {
  const asset = unitAsset(unit);
  const from = await oldestOfLatestTradingDays(userId, account, asset, MOVING_AVERAGE_DAYS);
  if (!from) return [];
  const rows = await getDailyAssetTotals(userId, { account, asset, from });
  return buildDaySummaries(rows).map((day) => day.netResult);
}

function averageScenarios(realizedNets: number[], movingNets: number[], pendingCount: number): AverageScenario[] {
  const candidates = [
    { key: "media" as const, label: "Média do mês", projection: projectMonthAtAverage(realizedNets, pendingCount) },
    {
      key: "movel" as const,
      label: `Média ${MOVING_AVERAGE_DAYS}d`,
      projection: projectMonthAtAverage(realizedNets, pendingCount, movingNets),
    },
  ];
  return candidates.flatMap(({ projection, ...rest }) => (projection ? [{ ...rest, projection }] : []));
}

// Projeção do mês e gestão da banca da conta (um ativo ou todos os operados com banca única).
// Independe do filtro de período do Dashboard.
export async function loadRiskDashboard(userId: string, account: AccountType, unit: SizingUnit, today: string) {
  const { config } = unit;
  const month = monthRange(today);
  const [monthRows, bankroll, movingNets, levelHistories] = await Promise.all([
    getDailyAssetTotals(userId, { account, asset: unitAsset(unit), ...month }),
    loadBankrollAnalysis(userId, account, unit),
    movingAverageNets(userId, account, unit),
    Promise.all(unit.assets.map((asset) => getLevelHistory(userId, account, asset))),
  ]);

  const { rules } = bankroll;
  const monthDays = buildDaySummaries(monthRows);
  const [year, monthNumber] = today.split("-").map(Number);
  const businessDays = businessDaysOfMonth(year, monthNumber).length;
  const pendingDays = pendingBusinessDays(today, new Set(monthDays.map((day) => day.day)));
  const pendingCount = pendingDays.length;
  const realizedNets = monthDays.map((day) => day.netResult);

  const assetResolvers = rules.assetRules.map((item) => item.ruleFor);
  const deviations = monthDays.flatMap((day) =>
    classifyDay(assetResolvers, day.day, day.pointsByAsset).map((deviation) => ({ day: day.day, ...deviation })),
  );

  return {
    account,
    config,
    label: unit.label,
    configs: unit.configs,
    today,
    monthLabel: monthFormatter.format(new Date(month.from)),
    nextMonth: monthNumber === 12 ? { year: year + 1, month: 1 } : { year, month: monthNumber + 1 },
    deviations,
    deviationCounts: countDeviations(deviations),
    businessDays,
    realizedDays: monthDays.length,
    pendingCount,
    pendingDays,
    scenarios: LOSS_DAY_SCENARIOS.map((lossDays) => projectMonth(config, realizedNets, pendingCount, lossDays)),
    averageScenarios: averageScenarios(realizedNets, movingNets, pendingCount),
    breakEven: breakEvenLossDays(config, businessDays),
    bankroll: bankroll.status,
    bankrollNet: bankroll.netSinceStart,
    bankrollDrawdown: bankroll.drawdown,
    bankrollHistory: bankroll.history,
    protectionEvents: bankroll.protectionEvents,
    simulation: bankroll.simulation,
    simulationDays: bankroll.simulationDays,
    ruleHistory: rules.ruleHistory,
    assetRuleHistories: rules.assetRules.map(({ asset, history }) => ({ asset, history })),
    bankrollMaxDrawdown: bankroll.maxDrawdown,
    contractChanges: contractChangesSince(levelHistories, config.bankrollStartDate),
    bankrollLevels: bankrollLevels(config, bankroll.status.bankroll),
  };
}

export type RiskDashboardData = Awaited<ReturnType<typeof loadRiskDashboard>>;
