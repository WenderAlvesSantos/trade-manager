import type { AccountType } from "@/generated/prisma/enums";
import { businessDaysOfMonth, monthRange, pendingBusinessDays } from "@/lib/b3-calendar";
import { bankrollLevels } from "@/lib/bankroll-sizing";
import { loadBankrollAnalysis } from "@/lib/bankroll";
import { classifyDayDeviation, countDeviations, ruleResolver } from "@/lib/day-deviation";
import { getLevelHistory, type LevelHistoryEntry } from "@/lib/level-history";
import {
  breakEvenLossDays,
  MOVING_AVERAGE_DAYS,
  projectMonth,
  projectMonthAtAverage,
  type AverageProjection,
} from "@/lib/risk-projection";
import { pickRule } from "@/lib/risk-rules";
import type { AccountRiskConfig } from "@/lib/risk-settings";
import { buildDaySummaries } from "@/lib/trade-aggregations";
import { getDailyAssetTotals, oldestOfLatestTradingDays } from "@/lib/trades";

export const LOSS_DAY_SCENARIOS = [2, 3, 4] as const;

export type AverageScenarioKey = "media" | "movel";
export type AverageScenario = { key: AverageScenarioKey; label: string; projection: AverageProjection };

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export type ContractChange = { day: string; from: number; to: number };

// Mudanças de contratos registradas desde o início da banca, em ordem cronológica.
function contractChangesSince(history: LevelHistoryEntry[], from: string): ContractChange[] {
  return history
    .map((entry) => ({ day: entry.date.toISOString().slice(0, 10), from: entry.fromContracts, to: entry.toContracts }))
    .filter((change) => change.day >= from)
    .reverse();
}

async function movingAverageNets(userId: string, account: AccountType, config: AccountRiskConfig) {
  const from = await oldestOfLatestTradingDays(userId, account, config.asset, MOVING_AVERAGE_DAYS);
  if (!from) return [];
  const rows = await getDailyAssetTotals(userId, { account, asset: config.asset, from });
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

// Projeção do mês e gestão de banca de uma conta + ativo. Independe do filtro de período do Dashboard.
export async function loadRiskDashboard(userId: string, account: AccountType, config: AccountRiskConfig, today: string) {
  const month = monthRange(today);
  const [monthRows, bankroll, movingNets, levelHistory] = await Promise.all([
    getDailyAssetTotals(userId, { account, asset: config.asset, ...month }),
    loadBankrollAnalysis(userId, account, config),
    movingAverageNets(userId, account, config),
    getLevelHistory(userId, account, config.asset),
  ]);

  const ruleFor = ruleResolver(pickRule(config), bankroll.ruleHistory);
  const monthDays = buildDaySummaries(monthRows);
  const [year, monthNumber] = today.split("-").map(Number);
  const businessDays = businessDaysOfMonth(year, monthNumber).length;
  const pendingCount = pendingBusinessDays(today, new Set(monthDays.map((day) => day.day))).length;
  const realizedNets = monthDays.map((day) => day.netResult);

  const deviations = monthDays.flatMap((day) => {
    const deviation = classifyDayDeviation(ruleFor(day.day), day.pointsByAsset);
    return deviation ? [{ day: day.day, ...deviation }] : [];
  });

  return {
    account,
    config,
    today,
    monthLabel: monthFormatter.format(new Date(month.from)),
    nextMonth: monthNumber === 12 ? { year: year + 1, month: 1 } : { year, month: monthNumber + 1 },
    deviations,
    deviationCounts: countDeviations(deviations),
    businessDays,
    realizedDays: monthDays.length,
    pendingCount,
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
    ruleHistory: bankroll.ruleHistory,
    bankrollMaxDrawdown: bankroll.maxDrawdown,
    contractChanges: contractChangesSince(levelHistory, config.bankrollStartDate),
    bankrollLevels: bankrollLevels(config, bankroll.status.bankroll),
  };
}

export type RiskDashboardData = Awaited<ReturnType<typeof loadRiskDashboard>>;
