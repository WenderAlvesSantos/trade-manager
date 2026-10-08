import type { Asset } from "@/generated/prisma/enums";
import { initialDrawdown, maxDrawdownOf, startPoints, stepDrawdown } from "@/lib/bankroll-drawdown";
import { contractsForBankroll, type SizingConfig } from "@/lib/bankroll-sizing";
import type { RuleResolver } from "@/lib/day-deviation";
import type { DaySummary } from "@/lib/trade-aggregations";
import { calculateDailyIrrf, FEE_PER_CONTRACT, POINT_VALUE, roundToCents } from "@/lib/trade-calculations";

// Resultado do dia por contrato: pontos líquidos do ativo (ganhos − perdidos) e trades para as taxas.
export type SimulationDay = { day: string; points: number; tradeCount: number };

export type SimulationPoint = { day: string; bankroll: number; peak: number; contracts: number };

export type SimulationResult = {
  points: SimulationPoint[];
  bankroll: number;
  contractChanges: number;
  // Vezes que a proteção de queda ligou e maior queda desde o pico (fração).
  protections: number;
  maxDrawdown: number;
};

// Dias do ativo em ordem cronológica, a partir dos resumos diários (que vêm do mais recente para o mais antigo).
export function simulationDays(days: DaySummary[], asset: Asset): SimulationDay[] {
  return [...days]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((day) => {
      const points = day.pointsByAsset[asset];
      return { day: day.day, points: points ? points.gained - points.lost : 0, tradeCount: day.tradeCount };
    });
}

// Líquido do dia com `contracts`: bruto e taxas B3 escalam pelos contratos; IRRF de 1% sobre o lucro do dia.
export function simulatedDayNet(asset: Asset, day: SimulationDay, contracts: number) {
  if (contracts <= 0) return 0;
  const gross = day.points * POINT_VALUE[asset] * contracts;
  const fees = day.tradeCount * FEE_PER_CONTRACT[asset] * contracts;
  const operatingProfit = roundToCents(gross - fees);
  return roundToCents(operatingProfit - calculateDailyIrrf(operatingProfit));
}

// Risco % e limite de queda fixos no período inteiro (comparação de opções), por cima das regras de cada época.
export type SimulationOverrides = Partial<Pick<SizingConfig, "riskPercent" | "drawdownLimit">>;

// Regra vigente no dia (stop, risco, margem, proteção, máximo); sem resolvedor, usa a configuração.
function configOn(config: SizingConfig, day: string, ruleFor?: RuleResolver, overrides: SimulationOverrides = {}): SizingConfig {
  if (!ruleFor) return { ...config, ...overrides };
  const { dailyStopLimit, riskPercent, marginPerContract, drawdownLimit, maxContracts } = ruleFor(day);
  return { ...config, dailyStopLimit, riskPercent, marginPerContract, drawdownLimit, maxContracts, ...overrides };
}

// Banca se cada dia fosse operado com os contratos recomendados no fechamento anterior (inclui a proteção de queda),
// com as regras vigentes em cada época. Recomendação 0 (banca abaixo de 1 contrato) = dia sem operar.
export function simulateRecommendations(
  config: SizingConfig,
  startDate: string,
  days: SimulationDay[],
  ruleFor?: RuleResolver,
  overrides?: SimulationOverrides,
): SimulationResult {
  let bankroll = config.initialBankroll;
  let state = initialDrawdown(bankroll);
  let previous: number | null = null;
  let contractChanges = 0;
  let protections = 0;
  const startContracts = contractsForBankroll(configOn(config, startDate, ruleFor, overrides), bankroll).recommended;
  const points = startPoints<SimulationPoint>(startDate, days[0]?.day, { day: startDate, bankroll, peak: bankroll, contracts: startContracts });

  for (const day of days) {
    const dayConfig = configOn(config, day.day, ruleFor, overrides);
    const contracts = contractsForBankroll(dayConfig, bankroll, state).recommended;
    if (previous !== null && contracts !== previous) contractChanges++;
    previous = contracts;
    bankroll = roundToCents(bankroll + simulatedDayNet(config.asset, day, contracts));
    const next = stepDrawdown(state, bankroll, dayConfig.drawdownLimit);
    if (next.protecting && !state.protecting) protections++;
    state = next;
    points.push({ day: day.day, bankroll, peak: state.peak, contracts });
  }
  return { points, bankroll, contractChanges, protections, maxDrawdown: maxDrawdownOf(points) };
}
