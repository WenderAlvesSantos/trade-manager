import type { AccountType, Asset } from "@/generated/prisma/enums";
import { bankrollHistory } from "@/lib/bankroll-drawdown";
import { simulateRecommendations, simulationDays } from "@/lib/bankroll-simulation";
import { bankrollStatus } from "@/lib/bankroll-sizing";
import { ruleResolver, type RuleResolver } from "@/lib/day-deviation";
import type { RiskConfig } from "@/lib/risk-projection";
import { getRuleHistory, pickRule } from "@/lib/risk-rules";
import { buildDaySummaries, buildEquityCurve, type DaySummary } from "@/lib/trade-aggregations";
import { getDailyAssetTotals } from "@/lib/trades";

async function loadBankrollDays(userId: string, account: AccountType, asset: Asset, from: string) {
  return buildDaySummaries(await getDailyAssetTotals(userId, { account, asset, from }));
}

// Líquido real do ativo por dia operado desde `from`, acumulado em ordem cronológica.
export async function loadBankrollCurve(userId: string, account: AccountType, asset: Asset, from: string) {
  return buildEquityCurve(await loadBankrollDays(userId, account, asset, from));
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

async function loadDaysAndRules(userId: string, account: AccountType, config: RiskConfig) {
  const [days, ruleHistory] = await Promise.all([
    loadBankrollDays(userId, account, config.asset, config.bankrollStartDate),
    getRuleHistory(userId, account, config.asset),
  ]);
  return { days, ruleHistory, ruleFor: ruleResolver(pickRule(config), ruleHistory) };
}

// Banca atual do ativo = banca inicial + líquido real desde a data de início; o pico vem da evolução diária.
// Leve: usada pelos avisos a cada trade registrado (sem simulações). Devolve o resolvedor de regras para reuso.
export async function loadBankrollStatus(userId: string, account: AccountType, config: RiskConfig) {
  const { days, ruleFor } = await loadDaysAndRules(userId, account, config);
  return { ...statusFrom(config, days, ruleFor), ruleFor };
}

// Status + simulação seguindo as recomendações com as regras de cada época. Os dias e o histórico de regras
// seguem para o navegador, que refaz a comparação de opções conforme a escolha do usuário.
export async function loadBankrollAnalysis(userId: string, account: AccountType, config: RiskConfig) {
  const { days, ruleHistory, ruleFor } = await loadDaysAndRules(userId, account, config);
  const simDays = simulationDays(days, config.asset);
  return {
    ...statusFrom(config, days, ruleFor),
    simulationDays: simDays,
    ruleHistory,
    simulation: simulateRecommendations(config, config.bankrollStartDate, simDays, ruleFor),
  };
}
