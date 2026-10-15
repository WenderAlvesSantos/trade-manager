import type { Asset } from "@/generated/prisma/enums";
import type { DrawdownState } from "@/lib/bankroll-drawdown";
import type { SimulationDay } from "@/lib/bankroll-simulation";
import { bankrollForContracts, contractsForBankroll, nextContracts, stopDayCost } from "@/lib/bankroll-sizing";
import type { RiskConfig } from "@/lib/risk-projection";
import type { DaySummary } from "@/lib/trade-aggregations";
import { FEE_PER_CONTRACT, POINT_VALUE } from "@/lib/trade-calculations";

// Banca única para vários ativos operando a mesma quantidade de contratos (como na planilha de gerenciamento).
// A conta vira uma configuração equivalente: valores em R$ expressos em pontos de UNIT_ASSET, com as taxas
// embutidas nos pontos (avgTradesPerDay = 0). Assim o dimensionamento, a escada do mês, o plano e as projeções
// funcionam igual para um ativo ou para a conta inteira. Um "dia de meta" ou "de stop" vale para todos os ativos.
export const UNIT_ASSET: Asset = "WIN";

const toUnitPoints = (value: number) => value / POINT_VALUE[UNIT_ASSET];
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const round2 = (value: number) => Math.round(value * 100) / 100;
const tradeFees = (config: RiskConfig) => config.avgTradesPerDay * FEE_PER_CONTRACT[config.asset];
const valueOf = (config: RiskConfig, points: number) => points * POINT_VALUE[config.asset];

const smallestPositive = (values: number[]) => {
  const positive = values.filter((value) => value > 0);
  return positive.length > 0 ? Math.min(...positive) : 0;
};

// Exige a soma das bancas de cada ativo (risco % e margem de cada um); máximo e proteção: os mais restritivos.
export function combinedConfig(configs: RiskConfig[]): RiskConfig {
  if (configs.length === 1) return configs[0];
  const stopCost = sum(configs.map((config) => stopDayCost(config, 1)));
  const required = sum(configs.map((config) => bankrollForContracts(config, 1)));
  const dates = (pick: (config: RiskConfig) => string) => configs.map(pick).sort();
  return {
    asset: UNIT_ASSET,
    contracts: Math.min(...configs.map((config) => config.contracts)),
    dailyGainTarget: toUnitPoints(sum(configs.map((config) => valueOf(config, config.dailyGainTarget)))),
    dailyStopLimit: toUnitPoints(stopCost),
    tradeTarget: configs[0].tradeTarget,
    tradeStop: configs[0].tradeStop,
    projectedGainDay: toUnitPoints(sum(configs.map((config) => valueOf(config, config.projectedGainDay) - tradeFees(config)))),
    projectedLossDay: toUnitPoints(sum(configs.map((config) => valueOf(config, config.projectedLossDay) + tradeFees(config)))),
    avgTradesPerDay: 0,
    deviationTolerance: toUnitPoints(sum(configs.map((config) => valueOf(config, config.deviationTolerance)))),
    initialBankroll: sum(configs.map((config) => config.initialBankroll)),
    bankrollStartDate: dates((config) => config.bankrollStartDate)[0],
    marginPerContract: 0,
    riskPercent: Number.isFinite(required) && required > 0 ? round2((100 * stopCost) / required) : 0,
    drawdownLimit: smallestPositive(configs.map((config) => config.drawdownLimit)),
    maxContracts: smallestPositive(configs.map((config) => config.maxContracts)),
    increaseBuffer: stopCost > 0 ? round2(sum(configs.map((config) => config.increaseBuffer * stopDayCost(config, 1))) / stopCost) : 0,
    levelStartDate: dates((config) => config.levelStartDate).at(-1)!,
  };
}

// Contratos para o próximo pregão com a banca combinada. `current` = contratos de hoje (null no início):
// reduções valem na hora; aumentos respeitam a folga para subir.
export function combinedContracts(configs: RiskConfig[], bankroll: number, drawdown: DrawdownState, current: number | null) {
  if (configs.length === 0) return 0;
  const unit = combinedConfig(configs);
  return current === null
    ? contractsForBankroll(unit, bankroll, drawdown).recommended
    : nextContracts(unit, bankroll, drawdown, current);
}

// Resultado real de cada dia por contrato (de cada ativo), em pontos da unidade e já sem as taxas.
export function combinedSimulationDays(days: DaySummary[], configs: RiskConfig[]): SimulationDay[] {
  return [...days]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((day) => {
      const values = configs.map((config) => {
        const points = day.pointsByAsset[config.asset];
        if (!points) return 0;
        const trades = day.tradesByAsset[config.asset] ?? 0;
        return valueOf(config, points.gained - points.lost) - trades * FEE_PER_CONTRACT[config.asset];
      });
      return { day: day.day, points: toUnitPoints(sum(values)), tradeCount: 0 };
    });
}
