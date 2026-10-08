import type { RiskConfig } from "@/lib/risk-projection";
import type { PointsByAsset } from "@/lib/trade-aggregations";

export type DeviationKind = "stop-excedido" | "meta-excedida" | "longe-dos-limites";

export type DayDeviation = { kind: DeviationKind; asset: RiskConfig["asset"]; points: number; message: string };

export type DeviationRule = Pick<RiskConfig, "asset" | "dailyGainTarget" | "dailyStopLimit" | "deviationTolerance">;
type DeviationConfig = DeviationRule;

// Regra versionada por data: limites do robô (desvios) e dimensionamento da banca.
export type RiskRule = DeviationRule & Pick<RiskConfig, "riskPercent" | "marginPerContract" | "drawdownLimit" | "maxContracts">;
export type DatedRule = RiskRule & { effectiveFrom: string };
export type RuleResolver = (day: string) => RiskRule;
type DeviationResolver = (day: string) => DeviationRule;

// Regra vigente em cada dia: a última versão com início <= dia. Sem versão aplicável, usa a regra atual.
export function ruleResolver<T extends DeviationRule>(current: T, history: (T & { effectiveFrom: string })[]) {
  const sorted = [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return (day: string): T => sorted.findLast((rule) => rule.effectiveFrom <= day) ?? current;
}

const pts = (value: number) => `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR")} pts`;

// Compara os pontos do dia (no ativo da configuração) com a meta/stop global do robô.
// Fora da tolerância: passou do stop, passou da meta ou terminou longe dos dois limites.
export function classifyDayDeviation(config: DeviationConfig, pointsByAsset: PointsByAsset): DayDeviation | null {
  const breakdown = pointsByAsset[config.asset];
  if (!breakdown) return null;

  const points = Math.round((breakdown.gained - breakdown.lost) * 100) / 100;
  const tolerance = config.deviationTolerance;
  const base = { asset: config.asset, points };

  if (points < -(config.dailyStopLimit + tolerance)) {
    return { ...base, kind: "stop-excedido", message: `${config.asset}: perda de ${pts(points)} passou do stop global (−${config.dailyStopLimit} pts).` };
  }
  if (points > config.dailyGainTarget + tolerance) {
    return { ...base, kind: "meta-excedida", message: `${config.asset}: ganho de ${pts(points)} passou da meta global (+${config.dailyGainTarget} pts); o robô seguiu operando.` };
  }
  if (points > -(config.dailyStopLimit - tolerance) && points < config.dailyGainTarget - tolerance) {
    return { ...base, kind: "longe-dos-limites", message: `${config.asset}: dia encerrado em ${pts(points)}, longe da meta e do stop configurados.` };
  }
  return null;
}

// Desvios de um dia em cada ativo operado (uma regra por ativo, vigente na data).
export function classifyDay(resolvers: DeviationResolver[], day: string, pointsByAsset: PointsByAsset): DayDeviation[] {
  return resolvers.flatMap((ruleFor) => classifyDayDeviation(ruleFor(day), pointsByAsset) ?? []);
}

export type DeviationCounts = Record<DeviationKind, number> & { total: number };

export function countDeviations(deviations: Pick<DayDeviation, "kind">[]): DeviationCounts {
  const counts: DeviationCounts = { "stop-excedido": 0, "meta-excedida": 0, "longe-dos-limites": 0, total: deviations.length };
  for (const { kind } of deviations) counts[kind] += 1;
  return counts;
}

export type MonthDeviationSummary = { month: string; operatedDays: number; counts: DeviationCounts };

// Contador por mês ("YYYY-MM"), do mais recente ao mais antigo, cada dia/ativo avaliado com a regra da época.
export function deviationsByMonth(
  resolvers: DeviationResolver[],
  days: { day: string; pointsByAsset: PointsByAsset }[],
): MonthDeviationSummary[] {
  const months = new Map<string, { operatedDays: number; deviations: DayDeviation[] }>();
  for (const { day, pointsByAsset } of days) {
    const month = day.slice(0, 7);
    const entry = months.get(month) ?? { operatedDays: 0, deviations: [] };
    entry.operatedDays += 1;
    entry.deviations.push(...classifyDay(resolvers, day, pointsByAsset));
    months.set(month, entry);
  }
  return [...months.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, { operatedDays, deviations }]) => ({ month, operatedDays, counts: countDeviations(deviations) }));
}
