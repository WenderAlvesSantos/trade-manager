import type { Asset } from "@/generated/prisma/enums";
import { initialDrawdown, stepDrawdown } from "@/lib/bankroll-drawdown";
import { combinedConfig, combinedContracts } from "@/lib/combined-sizing";
import type { RiskConfig } from "@/lib/risk-projection";
import { calculateDailyIrrf, FEE_PER_CONTRACT, POINT_VALUE, roundToCents } from "@/lib/trade-calculations";

// Padrão semanal: cada ativo tem 1 dia de stop a cada N pregões, em dias diferentes entre os ativos.
export const STOP_EVERY_CHOICES = [3, 4, 5, 7, 10] as const;
export const DEFAULT_STOP_EVERY = 5;
export const HORIZON_CHOICES = [1, 3, 6] as const;

export type ProjectedAsset = {
  asset: Asset;
  kind: "gain" | "loss";
  contracts: number;
  points: number;
  grossResult: number;
  fees: number;
};

export type ProjectedDay = {
  day: string;
  isToday: boolean;
  assets: ProjectedAsset[];
  grossResult: number;
  fees: number;
  operatingProfit: number;
  irrf: number;
  netResult: number;
  // Banca combinada no fim do dia e contratos para o pregão seguinte.
  bankroll: number;
  nextContracts: number;
};

type ProjectionOptions = { days: string[]; today: string; bankroll: number; stopEvery: number };

// O primeiro ativo para no 1º pregão projetado (conservador); os demais ficam defasados meio ciclo cada.
export function isWeeklyStop(dayIndex: number, assetIndex: number, every: number) {
  const offset = assetIndex * Math.floor(every / 2);
  return (dayIndex + offset) % Math.max(every, 1) === 0;
}

export function projectAsset(config: RiskConfig, contracts: number, kind: ProjectedAsset["kind"]): ProjectedAsset {
  const points = kind === "gain" ? config.projectedGainDay : -config.projectedLossDay;
  return {
    asset: config.asset,
    kind,
    contracts,
    points,
    grossResult: roundToCents(points * POINT_VALUE[config.asset] * contracts),
    fees: roundToCents(config.avgTradesPerDay * FEE_PER_CONTRACT[config.asset] * contracts),
  };
}

// Dia somado dos ativos: bruto e taxas de cada um, IRRF de 1% sobre o lucro operacional do dia.
export function sumAssets(assets: ProjectedAsset[], contracts: number) {
  const grossResult = roundToCents(assets.reduce((total, item) => total + item.grossResult, 0));
  const fees = roundToCents(assets.reduce((total, item) => total + item.fees, 0));
  const operatingProfit = roundToCents(grossResult - fees);
  const irrf = calculateDailyIrrf(operatingProfit);
  return { grossResult, fees, operatingProfit, irrf, netResult: contracts > 0 ? roundToCents(operatingProfit - irrf) : 0 };
}

// Pregões futuros com a banca combinada: contratos do dia vêm do fechamento anterior; IRRF sobre o dia somado.
export function projectDays(configs: RiskConfig[], options: ProjectionOptions): ProjectedDay[] {
  const drawdownLimit = configs.length > 0 ? combinedConfig(configs).drawdownLimit : 0;
  let bankroll = options.bankroll;
  let state = initialDrawdown(bankroll);
  let contracts = combinedContracts(configs, bankroll, state, null);

  return options.days.map((day, dayIndex) => {
    const assets = configs.map((config, assetIndex) =>
      projectAsset(config, contracts, isWeeklyStop(dayIndex, assetIndex, options.stopEvery) ? "loss" : "gain"),
    );
    const { grossResult, fees, operatingProfit, irrf, netResult } = sumAssets(assets, contracts);

    bankroll = roundToCents(bankroll + netResult);
    state = stepDrawdown(state, bankroll, drawdownLimit);
    const nextContracts = combinedContracts(configs, bankroll, state, contracts);
    const projected = { day, isToday: day === options.today, assets, grossResult, fees, operatingProfit, irrf, netResult, bankroll, nextContracts };
    contracts = nextContracts;
    return projected;
  });
}

// Pregões dentro dos `months` meses a partir do mês de `today` (inclusive).
export function daysWithinMonths(days: string[], today: string, months: number) {
  const [year, month] = today.split("-").map(Number);
  const lastIndex = year * 12 + month - 1 + months - 1;
  return days.filter((day) => {
    const [dayYear, dayMonth] = day.split("-").map(Number);
    return dayYear * 12 + dayMonth - 1 <= lastIndex;
  });
}
