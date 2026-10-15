import type { AccountType, Asset } from "@/generated/prisma/enums";
import { bankrollHistory } from "@/lib/bankroll-drawdown";
import { simulateRecommendations, simulationDays } from "@/lib/bankroll-simulation";
import { bankrollStatus } from "@/lib/bankroll-sizing";
import { combinedSimulationDays } from "@/lib/combined-sizing";
import type { RuleResolver } from "@/lib/day-deviation";
import type { RiskConfig } from "@/lib/risk-projection";
import { loadUnitRules, unitAsset, type SizingUnit } from "@/lib/sizing-unit";
import { buildDaySummaries, buildEquityCurve, type DaySummary } from "@/lib/trade-aggregations";
import { getDailyAssetTotals } from "@/lib/trades";

async function loadBankrollDays(userId: string, account: AccountType, asset: Asset, from: string) {
  return buildDaySummaries(await getDailyAssetTotals(userId, { account, asset, from }));
}

// Líquido real do ativo por dia operado desde `from`, acumulado em ordem cronológica.
export async function loadBankrollCurve(userId: string, account: AccountType, asset: Asset, from: string) {
  return buildEquityCurve(await loadBankrollDays(userId, account, asset, from));
}

// Dias da unidade: cada ativo conta a partir da data de início da própria banca.
async function loadUnitDays(userId: string, account: AccountType, unit: SizingUnit) {
  const rows = await getDailyAssetTotals(userId, { account, asset: unitAsset(unit), from: unit.config.bankrollStartDate });
  const startOf = new Map(unit.configs.map((config) => [config.asset, config.bankrollStartDate]));
  return buildDaySummaries(rows.filter((row) => row.day >= (startOf.get(row.asset) ?? "9999-12-31")));
}

// Líquido real da unidade por dia operado (IRRF sobre o dia somado), acumulado em ordem cronológica.
export async function loadUnitCurve(userId: string, account: AccountType, unit: SizingUnit) {
  return buildEquityCurve(await loadUnitDays(userId, account, unit));
}

// A proteção da banca real segue o limite de queda vigente em cada dia, como a simulação.
function statusFrom(config: RiskConfig, days: DaySummary[], ruleFor: RuleResolver) {
  const curve = buildEquityCurve(days);
  const limitOn = (day: string) => ruleFor(day).drawdownLimit;
  const history = bankrollHistory(config.initialBankroll, config.bankrollStartDate, curve, limitOn);
  return {
    netSinceStart: curve.at(-1)?.cumulative ?? 0,
    status: bankrollStatus(config, history.bankroll, history.drawdown),
    drawdown: history.drawdown,
    maxDrawdown: history.maxDrawdown,
    history: history.points,
    protectionEvents: history.events,
  };
}

async function loadDaysAndRules(userId: string, account: AccountType, unit: SizingUnit) {
  const [days, rules] = await Promise.all([loadUnitDays(userId, account, unit), loadUnitRules(userId, account, unit)]);
  return { days, rules };
}

// Banca atual = bancas iniciais + líquido real desde as datas de início; o pico vem da evolução diária.
// Leve: usada pelos avisos a cada trade registrado (sem simulações). Devolve as regras para reuso.
export async function loadBankrollStatus(userId: string, account: AccountType, unit: SizingUnit) {
  const { days, rules } = await loadDaysAndRules(userId, account, unit);
  return { ...statusFrom(unit.config, days, rules.ruleFor), rules };
}

// Status + simulação seguindo as recomendações com as regras de cada época. Os dias e o histórico de regras
// seguem para o navegador, que refaz a comparação de opções conforme a escolha do usuário.
export async function loadBankrollAnalysis(userId: string, account: AccountType, unit: SizingUnit) {
  const { days, rules } = await loadDaysAndRules(userId, account, unit);
  const { config } = unit;
  const simDays = unit.configs.length === 1 ? simulationDays(days, config.asset) : combinedSimulationDays(days, unit.configs);
  return {
    ...statusFrom(config, days, rules.ruleFor),
    simulationDays: simDays,
    rules,
    simulation: simulateRecommendations(config, config.bankrollStartDate, simDays, rules.ruleFor),
  };
}
