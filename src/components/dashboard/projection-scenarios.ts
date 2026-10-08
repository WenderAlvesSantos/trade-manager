import type { AverageScenarioKey, RiskDashboardData } from "@/lib/risk-dashboard-data";
import type { ForecastScenario } from "@/lib/risk-forecast";

// Cenários selecionáveis nos cards de projeção: 2/3/4 dias de stop ou uma das médias reais.
export type ScenarioKey = number | AverageScenarioKey;

export const DEFAULT_SCENARIO: ScenarioKey = 3;

const AVERAGE_KEYS: readonly string[] = ["media", "movel"] satisfies AverageScenarioKey[];

export function scenarioOptions(data: RiskDashboardData, stopsLabel: string) {
  const options: { value: ScenarioKey; label: string }[] = data.scenarios.map((item) => ({
    value: item.lossDays,
    label: `${item.lossDays} ${stopsLabel}`,
  }));
  return [...options, ...data.averageScenarios.map(({ key, label }) => ({ value: key, label }))];
}

export const parseScenarioKey = (value: string | number): ScenarioKey =>
  AVERAGE_KEYS.includes(String(value)) ? (value as AverageScenarioKey) : Number(value);

export const findAverageScenario = (data: RiskDashboardData, key: ScenarioKey) =>
  data.averageScenarios.find((item) => item.key === key) ?? null;

export const findStopScenario = (data: RiskDashboardData, key: ScenarioKey) =>
  data.scenarios.find((item) => item.lossDays === key) ?? data.scenarios[0];

// Líquido projetado para os pregões que faltam no mês corrente.
export function pendingNetFor(data: RiskDashboardData, key: ScenarioKey) {
  return (findAverageScenario(data, key)?.projection ?? findStopScenario(data, key)).pendingNet;
}

// A média foi obtida com os contratos atuais; vira valor por contrato para escalar quando a banca muda os contratos.
export function forecastScenarioFor(data: RiskDashboardData, key: ScenarioKey): ForecastScenario {
  const average = findAverageScenario(data, key);
  if (average) return { dailyNetPerContract: average.projection.average / data.config.contracts };
  return { lossDays: findStopScenario(data, key).lossDays };
}
