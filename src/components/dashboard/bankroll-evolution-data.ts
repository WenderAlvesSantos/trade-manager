import { bankrollForContracts } from "@/lib/bankroll-sizing";
import { formatCurrency, formatDate } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { ruleChanges } from "@/lib/rule-changes";
import { COLORS } from "@/lib/theme";
import type { ChartMarker, MoneyPoint } from "./money-line-chart";

export const EVOLUTION_COLORS = [COLORS.profit, COLORS.primary, COLORS.loss, COLORS.warning];
const RULE_COLOR = "#a855f7";

// Rótulo curto na linha do gráfico; o texto completo aparece no tooltip do dia.
type ChartEvent = { day: string; short: string; detail: string; color: string };

function chartEvents(data: RiskDashboardData): ChartEvent[] {
  const { config, today } = data;
  const events: ChartEvent[] = [
    ...data.contractChanges.map((change) => ({
      day: change.day,
      short: `${change.from}→${change.to}`,
      detail: `Contratos: ${change.from} → ${change.to}`,
      color: COLORS.primary,
    })),
    ...ruleChanges(data.ruleHistory, config.bankrollStartDate).map((change) => ({
      day: change.day,
      short: "Regra",
      detail: `Regra: ${change.changes.join(", ")}`,
      color: RULE_COLOR,
    })),
    ...data.protectionEvents.map((event) => ({
      day: event.day,
      short: event.on ? "Proteção" : "Fim prot.",
      detail: `${event.on ? "Proteção ligou" : "Proteção desligou"} com banca de ${formatCurrency(event.bankroll)} (pico ${formatCurrency(event.peak)})`,
      color: event.on ? COLORS.loss : COLORS.profit,
    })),
  ];
  return events.filter((event) => event.day >= config.bankrollStartDate && event.day <= today);
}

// Eixo: dias operados + dias de eventos + hoje, em ordem cronológica.
function axisDays(data: RiskDashboardData, events: ChartEvent[]) {
  const days = new Set([...data.bankrollHistory.map((point) => point.day), ...events.map((event) => event.day)]);
  if (data.bankrollHistory.length > 0) days.add(data.today);
  return [...days].sort();
}

// Último ponto com dia <= cada dia do eixo (a banca não muda em dias sem pregão).
function carryForward<T extends { day: string }>(points: T[], days: string[]) {
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day));
  let index = -1;
  return days.map((day) => {
    while (index + 1 < sorted.length && sorted[index + 1].day <= day) index++;
    return index >= 0 ? sorted[index] : undefined;
  });
}

export type EvolutionChart = { series: MoneyPoint[]; markers: ChartMarker[]; details: Record<string, string> };

function buildSeries(data: RiskDashboardData, days: string[]): MoneyPoint[] {
  const { config } = data;
  const minimum = bankrollForContracts(config, config.contracts);
  const minimumLabel = `Mínimo p/ ${config.contracts} contr.`;
  const real = carryForward(data.bankrollHistory, days);
  const simulated = carryForward(data.simulation.points, days);

  return days.flatMap((day, index) => {
    const point = real[index];
    if (!point) return [];
    const label = formatDate(day);
    const sim = simulated[index];
    return [
      { label, value: point.bankroll, series: "Banca" },
      { label, value: point.peak, series: "Pico" },
      { label, value: minimum, series: minimumLabel },
      ...(sim ? [{ label, value: sim.bankroll, series: "Seguindo recomendações" }] : []),
    ];
  });
}

// Uma marcação por dia (rótulos curtos juntos) e o texto completo de cada dia para o tooltip.
export function evolutionChart(data: RiskDashboardData): EvolutionChart {
  const events = chartEvents(data);
  const days = axisDays(data, events);
  const byDay = new Map<string, ChartEvent[]>();
  for (const event of events) byDay.set(event.day, [...(byDay.get(event.day) ?? []), event]);

  const markers: ChartMarker[] = [];
  const details: Record<string, string> = {};
  for (const [day, dayEvents] of byDay) {
    const label = formatDate(day);
    markers.push({ label, text: dayEvents.map((event) => event.short).join(" · "), color: dayEvents[0].color });
    details[label] = dayEvents.map((event) => event.detail).join(" | ");
  }
  return { series: buildSeries(data, days), markers, details };
}
