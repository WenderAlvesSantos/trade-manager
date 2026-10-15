import type { DrawdownState } from "@/lib/bankroll-drawdown";
import { bankrollLevel, contractsForBankroll, type BankrollLevel } from "@/lib/bankroll-sizing";
import { forecastMonths, type ForecastScenario } from "@/lib/risk-forecast";
import type { RiskConfig } from "@/lib/risk-projection";
import type { StopsMode } from "@/lib/stops-mode";

// Horizonte da previsão de cada etapa (meses).
export const PLAN_HORIZON_MONTHS = 60;

// Etapas intermediárias "redondas" entre o nível atual e o máximo.
const MILESTONES = [2, 3, 5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 500, 750, 1000];

export type YearMonth = { year: number; month: number };

export type PlanStep = BankrollLevel & {
  // Já liberado pela banca atual; senão, mês (fim) em que a banca projetada alcança a etapa (null = além do horizonte).
  reached: boolean;
  reachedAt: YearMonth | null;
  monthsAhead: number | null;
};

export type ContractPlan = { target: number; current: number; steps: PlanStep[] };

type PlanOptions = {
  start: YearMonth;
  scenario: ForecastScenario;
  // Banca projetada no início do primeiro mês e pico/proteção atuais.
  initialBankroll: number;
  drawdown?: DrawdownState;
  // Ativos que dividem a banca e como os stops caem entre eles (ver forecastMonths).
  assets?: RiskConfig[];
  stops?: StopsMode;
};

export function planMilestones(current: number, target: number) {
  const between = MILESTONES.filter((value) => value > current && value < target);
  return [...new Set([current, current + 1, ...between, target])].filter((value) => value >= current && value <= target);
}

// Do nível que a banca atual libera até o máximo configurado: banca necessária, lucro que falta e previsão.
export function contractPlan(config: RiskConfig, bankroll: number, options: PlanOptions): ContractPlan | null {
  const target = config.maxContracts;
  if (!(target > 0)) return null;

  const current = Math.max(contractsForBankroll(config, bankroll).unprotected, 1);
  const months = forecastMonths(config, {
    startYear: options.start.year,
    startMonth: options.start.month,
    months: PLAN_HORIZON_MONTHS,
    scenario: options.scenario,
    initialBankroll: options.initialBankroll,
    drawdown: options.drawdown,
    assets: options.assets,
    stops: options.stops,
  });

  const steps = planMilestones(Math.min(current, target), target).map((contracts): PlanStep => {
    const level = bankrollLevel(config, bankroll, contracts);
    const reached = level.missing === 0;
    const index = reached ? -1 : months.findIndex((month) => month.bankroll >= level.requiredBankroll);
    const month = index >= 0 ? months[index] : null;
    return {
      ...level,
      reached,
      reachedAt: month ? { year: month.year, month: month.month } : null,
      monthsAhead: month ? index + 1 : null,
    };
  });
  return { target, current: Math.min(current, target), steps };
}

// Riscos comparados no prazo até o máximo (o risco configurado entra junto).
export const PLAN_RISKS = [5, 10, 15, 25];

export type RiskTimeline = {
  riskPercent: number;
  current: boolean;
  contractsToday: number;
  targetBankroll: number;
  monthsAhead: number | null;
  reachedAt: YearMonth | null;
  streakLoss: number;
};

// Mesmo cenário e banca, mudando só o risco %: quanto tempo cada um leva até o máximo e quanto 4 stops seguidos custam.
export function riskTimelines(config: RiskConfig, bankroll: number, options: PlanOptions, risks = PLAN_RISKS) {
  const choices = [...new Set([...risks, config.riskPercent])].sort((a, b) => a - b);
  return choices.flatMap((riskPercent): RiskTimeline[] => {
    const plan = contractPlan({ ...config, riskPercent }, bankroll, options);
    const target = plan?.steps.at(-1);
    if (!plan || !target) return [];
    return [
      {
        riskPercent,
        current: riskPercent === config.riskPercent,
        contractsToday: contractsForBankroll({ ...config, riskPercent }, bankroll).unprotected,
        targetBankroll: target.requiredBankroll,
        monthsAhead: target.reached ? 0 : target.monthsAhead,
        reachedAt: target.reachedAt,
        streakLoss: streakLoss(riskPercent, 4),
      },
    ];
  });
}

// Parte da banca perdida após `days` dias de stop seguidos operando sempre no limite de risco.
export function streakLoss(riskPercent: number, days: number) {
  return 1 - (1 - riskPercent / 100) ** days;
}
