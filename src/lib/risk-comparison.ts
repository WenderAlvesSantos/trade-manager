import { simulateRecommendations, type SimulationDay, type SimulationOverrides } from "@/lib/bankroll-simulation";
import type { SizingConfig } from "@/lib/bankroll-sizing";
import type { RuleResolver } from "@/lib/day-deviation";

// Sugestões dos seletores; o usuário pode digitar outros valores.
export const RISK_CHOICES = [3, 5, 7.5, 10, 12.5, 15, 20];
export const DRAWDOWN_CHOICES = [0, 10, 15, 20, 25, 30];
export const DEFAULT_RISKS = [5, 10, 15];

export type ComparisonOptions = { risks: number[]; drawdowns: number[] };

export type RiskComparisonRow = {
  key: string;
  // Linha de referência: regras de cada época, sem fixar risco nem limite de queda.
  era: boolean;
  riskPercent: number;
  drawdownLimit: number;
  current: boolean;
  bankroll: number;
  // Retorno sobre a banca inicial e maior queda desde o pico (frações).
  returnRate: number;
  maxDrawdown: number;
  // Retorno por unidade de queda; null = sem queda no período.
  returnPerDrawdown: number | null;
  protections: number;
  contractChanges: number;
};

export type RiskComparison = { rows: RiskComparisonRow[]; bestKey: string | null };

const unique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

// Melhor equilíbrio: maior retorno por unidade de queda entre as opções com retorno positivo (sem queda vence);
// empate, maior retorno. A linha de referência não concorre.
function bestOf(rows: RiskComparisonRow[]) {
  const score = (row: RiskComparisonRow) => row.returnPerDrawdown ?? Infinity;
  const better = (row: RiskComparisonRow, best: RiskComparisonRow) =>
    score(row) > score(best) || (score(row) === score(best) && row.returnRate > best.returnRate);
  const candidates = rows.filter((row) => !row.era && row.returnRate > 0);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, row) => (better(row, best) ? row : best)).key;
}

type SimulationInput = { config: SizingConfig; startDate: string; days: SimulationDay[]; ruleFor?: RuleResolver };

function simulateRow(input: SimulationInput, key: string, overrides: SimulationOverrides | undefined): RiskComparisonRow {
  const { config, startDate, days, ruleFor } = input;
  const result = simulateRecommendations(config, startDate, days, ruleFor, overrides);
  const riskPercent = overrides?.riskPercent ?? config.riskPercent;
  const drawdownLimit = overrides?.drawdownLimit ?? config.drawdownLimit;
  const returnRate = config.initialBankroll > 0 ? (result.bankroll - config.initialBankroll) / config.initialBankroll : 0;
  return {
    key,
    era: overrides === undefined,
    riskPercent,
    drawdownLimit,
    current: overrides !== undefined && riskPercent === config.riskPercent && drawdownLimit === config.drawdownLimit,
    bankroll: result.bankroll,
    returnRate,
    maxDrawdown: result.maxDrawdown,
    returnPerDrawdown: result.maxDrawdown > 0 ? returnRate / result.maxDrawdown : null,
    protections: result.protections,
    contractChanges: result.contractChanges,
  };
}

// Refaz o período seguindo as recomendações para cada combinação de risco % × limite de queda (fixos no período),
// mais a referência com as regras de cada época.
export function compareRiskOptions(input: SimulationInput, options: ComparisonOptions): RiskComparison {
  const combos = unique(options.risks).flatMap((riskPercent) =>
    unique(options.drawdowns).map((drawdownLimit) => ({ riskPercent, drawdownLimit })),
  );
  const rows = [
    simulateRow(input, "era", undefined),
    ...combos.map((combo) => simulateRow(input, `${combo.riskPercent}-${combo.drawdownLimit}`, combo)),
  ];
  return { rows, bestKey: bestOf(rows) };
}
