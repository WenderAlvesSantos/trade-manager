import type { AccountType, Asset } from "@/generated/prisma/enums";
import { combinedConfig } from "@/lib/combined-sizing";
import { ruleResolver, type DatedRule, type RuleResolver } from "@/lib/day-deviation";
import type { RiskConfig } from "@/lib/risk-projection";
import { getRuleHistory, pickRule } from "@/lib/risk-rules";

// Banca da conta: os ativos operados dividem uma banca e a mesma quantidade de contratos.
// Com um único ativo, `config` é a própria configuração dele.
export type SizingUnit = { label: string; assets: Asset[]; configs: RiskConfig[]; config: RiskConfig };

export function sizingUnit(configs: RiskConfig[]): SizingUnit {
  return {
    label: configs.map((config) => config.asset).join(" + "),
    assets: configs.map((config) => config.asset),
    configs,
    config: combinedConfig(configs),
  };
}

// Filtro de ativo das consultas: com vários ativos, a conta inteira (todos os operados).
export const unitAsset = (unit: SizingUnit) => (unit.assets.length === 1 ? unit.assets[0] : undefined);

export type UnitRules = {
  // Regra da unidade vigente em cada dia (combinada a partir das regras de cada ativo na data).
  ruleFor: RuleResolver;
  ruleHistory: DatedRule[];
  // Regras de cada ativo, para desvios e para exibir as mudanças com o nome do ativo.
  assetRules: { asset: Asset; ruleFor: RuleResolver; history: DatedRule[] }[];
};

export async function loadUnitRules(userId: string, account: AccountType, unit: SizingUnit): Promise<UnitRules> {
  const histories = await Promise.all(unit.configs.map((config) => getRuleHistory(userId, account, config.asset)));
  const assetRules = unit.configs.map((config, index) => ({
    asset: config.asset,
    ruleFor: ruleResolver(pickRule(config), histories[index]),
    history: histories[index],
  }));
  if (assetRules.length === 1) return { ruleFor: assetRules[0].ruleFor, ruleHistory: histories[0], assetRules };

  const ruleFor: RuleResolver = (day) =>
    pickRule(combinedConfig(unit.configs.map((config, index): RiskConfig => ({ ...config, ...assetRules[index].ruleFor(day) }))));
  const dates = [...new Set(histories.flat().map((rule) => rule.effectiveFrom))].sort();
  return { ruleFor, ruleHistory: dates.map((effectiveFrom) => ({ ...ruleFor(effectiveFrom), effectiveFrom })), assetRules };
}
