import type { AccountType, Asset } from "@/generated/prisma/enums";
import { pendingBusinessDays } from "@/lib/b3-calendar";
import { classifyDay, deviationsByMonth, type DayDeviation } from "@/lib/day-deviation";
import { projectedDayNet, type RiskConfig } from "@/lib/risk-projection";
import { getRuleResolver } from "@/lib/risk-rules";
import { activeConfigs, getAccountRiskConfigs } from "@/lib/risk-settings";
import type { DaySummary } from "@/lib/trade-aggregations";
import type { TradeFilters } from "@/lib/trade-filters";

// Faixa projetada (meta/stop) de um ativo num dia pendente.
export type PendingRange = {
  asset: Asset;
  gainPoints: number;
  lossPoints: number;
  gainNet: number;
  lossNet: number;
  robotGain: number;
  robotStop: number;
};

// Dia de pregão do mês ainda sem resultado, com a faixa de cada ativo operado na conta.
export type PendingDay = { day: string; isToday: boolean; ranges: PendingRange[] };

function pendingRange(config: RiskConfig): PendingRange {
  return {
    asset: config.asset,
    gainPoints: config.projectedGainDay,
    lossPoints: config.projectedLossDay,
    gainNet: projectedDayNet(config, config.contracts, "gain"),
    lossNet: projectedDayNet(config, config.contracts, "loss"),
    robotGain: config.dailyGainTarget,
    robotStop: config.dailyStopLimit,
  };
}

export function buildPendingDays(configs: RiskConfig[], pendingDays: string[], today: string): PendingDay[] {
  const ranges = configs.map(pendingRange);
  return pendingDays.map((day) => ({ day, isToday: day === today, ranges }));
}

export type DeviationsByDay = Record<string, DayDeviation[]>;

// Pendentes do mês e desvios. Só existe com uma conta selecionada: a configuração é por conta + ativo.
export async function loadRiskOverlay(
  userId: string,
  filters: TradeFilters & { account: AccountType },
  days: DaySummary[],
  visibleDays: DaySummary[],
  today: string,
) {
  const configs = activeConfigs(await getAccountRiskConfigs(userId, filters.account, today), filters.asset);
  const resolvers = await Promise.all(configs.map((config) => getRuleResolver(userId, filters.account, config)));
  const pending = pendingBusinessDays(today, new Set(days.map((day) => day.day)), filters);

  const deviations: DeviationsByDay = {};
  for (const day of visibleDays) {
    const found = classifyDay(resolvers, day.day, day.pointsByAsset);
    if (found.length > 0) deviations[day.day] = found;
  }

  return {
    pendingDays: configs.length > 0 ? buildPendingDays(configs, pending.reverse(), today) : [],
    deviations,
    monthlyDeviations: deviationsByMonth(resolvers, days),
  };
}
