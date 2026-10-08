import type { Asset } from "@/generated/prisma/enums";

export const POINT_VALUE: Record<Asset, number> = {
  WIN: 0.2,
  WDO: 10,
};

// Taxas B3 estimadas por contrato (ida e volta), corretagem zero na Genial.
export const FEE_PER_CONTRACT: Record<Asset, number> = {
  WIN: 0.5,
  WDO: 2.5,
};

export const IRRF_RATE = 0.01;

export type TradeInput = {
  asset: Asset;
  contracts: number;
  points: number;
};

export type TradeResult = {
  grossResult: number;
  fees: number;
  taxes: number;
  netResult: number;
};

const roundToCents = (value: number) => Math.round(value * 100) / 100;

export function calculateTradeResult({
  asset,
  contracts,
  points,
}: TradeInput): TradeResult {
  const grossResult = roundToCents(points * contracts * POINT_VALUE[asset]);
  const fees = roundToCents(contracts * FEE_PER_CONTRACT[asset]);
  const resultAfterFees = grossResult - fees;
  const taxes =
    resultAfterFees > 0 ? roundToCents(resultAfterFees * IRRF_RATE) : 0;
  const netResult = roundToCents(grossResult - fees - taxes);

  return { grossResult, fees, taxes, netResult };
}
