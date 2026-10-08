import type { Asset } from "@/generated/prisma/enums";
import { calculateDailyIrrf, FEE_PER_CONTRACT, POINT_VALUE, roundToCents } from "@/lib/trade-calculations";

export const ASSETS: Asset[] = ["WIN", "WDO"];

// Lote a partir do qual ordens a mercado do robô tendem a consumir vários níveis do livro (slippage relevante).
// Referência conservadora para pessoa física; não é limite da B3 nem da corretora.
export const LIQUID_CONTRACTS: Record<Asset, number> = { WIN: 300, WDO: 100 };

export const exceedsLiquidity = (config: Pick<RiskConfig, "asset" | "maxContracts">) =>
  config.maxContracts > LIQUID_CONTRACTS[config.asset];

// Configuração de risco de uma conta + ativo. Pontos sempre positivos; o sinal vem do contexto (meta/stop).
export type RiskConfig = {
  asset: Asset;
  contracts: number;
  dailyGainTarget: number;
  dailyStopLimit: number;
  tradeTarget: number;
  tradeStop: number;
  projectedGainDay: number;
  projectedLossDay: number;
  avgTradesPerDay: number;
  deviationTolerance: number;
  initialBankroll: number;
  bankrollStartDate: string;
  marginPerContract: number;
  riskPercent: number;
  drawdownLimit: number;
  // Teto de contratos que deseja operar; 0 = sem limite.
  maxContracts: number;
  levelStartDate: string;
};

export type DayKind = "gain" | "loss";

export type DayNetConfig = Pick<RiskConfig, "asset" | "projectedGainDay" | "projectedLossDay" | "avgTradesPerDay">;

// Líquido de um dia projetado (meta ou stop) com taxas B3 estimadas e IRRF diário.
export function projectedDayNet(config: DayNetConfig, contracts: number, kind: DayKind) {
  const points = kind === "gain" ? config.projectedGainDay : -config.projectedLossDay;
  const gross = points * POINT_VALUE[config.asset] * contracts;
  const fees = config.avgTradesPerDay * contracts * FEE_PER_CONTRACT[config.asset];
  const operatingProfit = roundToCents(gross - fees);
  return roundToCents(operatingProfit - calculateDailyIrrf(operatingProfit));
}

// Quanto um dia de stop custa (valor positivo) com um dado número de contratos.
export const dailyRisk = (config: DayNetConfig, contracts: number) => -projectedDayNet(config, contracts, "loss");

export type MonthProjection = {
  lossDays: number;
  realizedNet: number;
  realizedLossDays: number;
  pendingGainDays: number;
  pendingLossDays: number;
  pendingNet: number;
  total: number;
};

// `lossDays` é o total de dias de stop no mês: os que já aconteceram contam, o restante cai nos pendentes.
export function projectMonth(config: RiskConfig, realizedNets: number[], pendingCount: number, lossDays: number): MonthProjection {
  const realizedNet = roundToCents(realizedNets.reduce((sum, net) => sum + net, 0));
  const realizedLossDays = realizedNets.filter((net) => net < 0).length;
  const pendingLossDays = Math.min(Math.max(lossDays - realizedLossDays, 0), pendingCount);
  const pendingGainDays = pendingCount - pendingLossDays;
  const pendingNet = roundToCents(
    pendingGainDays * projectedDayNet(config, config.contracts, "gain") +
      pendingLossDays * projectedDayNet(config, config.contracts, "loss"),
  );

  return {
    lossDays,
    realizedNet,
    realizedLossDays,
    pendingGainDays,
    pendingLossDays,
    pendingNet,
    total: roundToCents(realizedNet + pendingNet),
  };
}

export type AverageProjection = {
  realizedDays: number;
  sampleDays: number;
  average: number;
  realizedNet: number;
  pendingNet: number;
  total: number;
};

// ~3 semanas de pregões: reage no começo do mês, quando a média do mês ainda tem poucos dias.
export const MOVING_AVERAGE_DAYS = 15;

const sumNets = (nets: number[]) => roundToCents(nets.reduce((sum, net) => sum + net, 0));

// Repete o líquido médio da amostra nos pregões pendentes. A amostra padrão são os dias do próprio mês;
// a média móvel usa os últimos N dias operados (inclusive de meses anteriores). Amostra vazia = sem cenário.
export function projectMonthAtAverage(
  realizedNets: number[],
  pendingCount: number,
  sampleNets: number[] = realizedNets,
): AverageProjection | null {
  if (sampleNets.length === 0) return null;
  const realizedNet = sumNets(realizedNets);
  const average = roundToCents(sumNets(sampleNets) / sampleNets.length);
  const pendingNet = roundToCents(average * pendingCount);
  return {
    realizedDays: realizedNets.length,
    sampleDays: sampleNets.length,
    average,
    realizedNet,
    pendingNet,
    total: roundToCents(realizedNet + pendingNet),
  };
}

// Máximo de dias de stop em `businessDays` pregões para o mês ainda fechar >= 0.
export function breakEvenLossDays(config: RiskConfig, businessDays: number) {
  const gain = projectedDayNet(config, config.contracts, "gain");
  const loss = dailyRisk(config, config.contracts);
  if (gain <= 0) return 0;
  if (loss <= 0) return businessDays;
  return Math.floor((businessDays * gain) / (gain + loss));
}

// Win rate mínimo por trade para empatar com a relação alvo/stop configurada.
export const minimumWinRate = (config: RiskConfig) => config.tradeStop / (config.tradeTarget + config.tradeStop);
