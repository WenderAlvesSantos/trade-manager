import type { DatedRule, RiskRule } from "@/lib/day-deviation";

type RuleField = Exclude<keyof RiskRule, "asset">;

export const formatMaxContracts = (value: number) => (value > 0 ? `${value} contr.` : "sem limite");
export const formatIncreaseBuffer = (value: number) => (value > 0 ? `${value} stop(s)` : "sem folga");

const FIELDS: { key: RuleField; label: string; format: (value: number) => string }[] = [
  { key: "dailyStopLimit", label: "stop", format: (value) => `${value} pts` },
  { key: "dailyGainTarget", label: "meta", format: (value) => `${value} pts` },
  { key: "deviationTolerance", label: "tolerância", format: (value) => `${value} pts` },
  { key: "riskPercent", label: "risco", format: (value) => `${value}%` },
  { key: "marginPerContract", label: "margem", format: (value) => (value > 0 ? `R$ ${value}` : "sem teto") },
  { key: "drawdownLimit", label: "proteção", format: (value) => (value > 0 ? `${value}%` : "desligada") },
  { key: "maxContracts", label: "máximo", format: formatMaxContracts },
  { key: "increaseBuffer", label: "folga", format: formatIncreaseBuffer },
];

export type RuleChange = { day: string; changes: string[] };

// O que mudou em cada versão de regra (a partir de `from`) em relação à anterior; a base não conta como mudança.
export function ruleChanges(history: DatedRule[], from: string): RuleChange[] {
  const sorted = [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return sorted.flatMap((rule, index) => {
    const previous = sorted[index - 1];
    if (!previous || rule.effectiveFrom < from) return [];
    const changes = FIELDS.filter(({ key }) => previous[key] !== rule[key]).map(
      ({ key, label, format }) => `${label} ${format(previous[key])}→${format(rule[key])}`,
    );
    return changes.length > 0 ? [{ day: rule.effectiveFrom, changes }] : [];
  });
}
