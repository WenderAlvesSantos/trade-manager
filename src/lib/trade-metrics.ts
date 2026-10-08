import { roundToCents } from "@/lib/trade-calculations";
import type { EquityPoint } from "@/lib/trade-aggregations";

export type RiskMetrics = {
  // Maior queda do acumulado a partir de um topo anterior (o topo inicial é o zero do período).
  maxDrawdown: number;
  // Maior queda relativa ao topo (0.25 = 25%). Só existe com topo positivo; null se o acumulado nunca ficou acima de zero.
  maxDrawdownPercent: number | null;
  maxWinStreak: number;
  maxLossStreak: number;
  // Positivo = dias positivos seguidos até o último dia; negativo = dias negativos seguidos.
  currentStreak: number;
};

const nextStreak = (streak: number, net: number) => {
  if (net > 0) return streak > 0 ? streak + 1 : 1;
  if (net < 0) return streak < 0 ? streak - 1 : -1;
  return 0;
};

// Espera a curva em ordem cronológica. Sequências contam dias pelo líquido; um dia zerado interrompe as duas.
export function computeRiskMetrics(curve: EquityPoint[]): RiskMetrics {
  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent: number | null = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let streak = 0;

  for (const { net, cumulative } of curve) {
    peak = Math.max(peak, cumulative);
    const drawdown = peak - cumulative;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    if (peak > 0) maxDrawdownPercent = Math.max(maxDrawdownPercent ?? 0, drawdown / peak);

    streak = nextStreak(streak, net);
    maxWinStreak = Math.max(maxWinStreak, streak);
    maxLossStreak = Math.max(maxLossStreak, -streak);
  }

  return {
    maxDrawdown: roundToCents(maxDrawdown),
    maxDrawdownPercent,
    maxWinStreak,
    maxLossStreak,
    currentStreak: streak,
  };
}
