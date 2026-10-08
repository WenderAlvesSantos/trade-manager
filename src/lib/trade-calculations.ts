import type { Asset } from "@/generated/prisma/enums";

export const POINT_VALUE: Record<Asset, number> = {
  WIN: 0.2,
  WDO: 10,
};

// Custo B3 estimado por contrato (ida e volta), corretagem zero na Genial.
export const FEE_PER_CONTRACT: Record<Asset, number> = {
  WIN: 0.48,
  WDO: 2.4,
};

// IRRF "dedo-duro" de day trade: 1% sobre o lucro operacional do DIA, nunca por trade.
export const IRRF_RATE = 0.01;

export type TradeInput = {
  asset: Asset;
  contracts: number;
  points: number;
};

export const roundToCents = (value: number) => Math.round(value * 100) / 100;

export function calculateTradeResult({ asset, contracts, points }: TradeInput) {
  return {
    grossResult: roundToCents(points * contracts * POINT_VALUE[asset]),
    fees: roundToCents(contracts * FEE_PER_CONTRACT[asset]),
  };
}

export function calculateDailyIrrf(operatingProfit: number) {
  return operatingProfit > 0 ? roundToCents(operatingProfit * IRRF_RATE) : 0;
}
