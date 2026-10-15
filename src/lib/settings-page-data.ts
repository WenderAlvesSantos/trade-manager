import type { AccountType, Asset } from "@/generated/prisma/enums";
import { loadBankrollCurve, loadUnitCurve } from "@/lib/bankroll";
import type { DatedRule } from "@/lib/day-deviation";
import { getLevelHistory, type LevelHistoryEntry } from "@/lib/level-history";
import { getRuleHistory } from "@/lib/risk-rules";
import { ASSETS } from "@/lib/risk-projection";
import { getAllRiskConfigs, type AccountRiskConfig, type AssetConfigs } from "@/lib/risk-settings";
import { sizingUnit } from "@/lib/sizing-unit";
import type { EquityPoint } from "@/lib/trade-aggregations";

export type AssetSettingsData = {
  config: AccountRiskConfig;
  levelHistory: LevelHistoryEntry[];
  // Mais recente primeiro.
  ruleHistory: DatedRule[];
  // Líquido real acumulado por dia desde o início da banca salva (a prévia recalcula banca, pico e proteção).
  bankrollCurve: EquityPoint[];
};

export type AccountSettingsData = {
  assets: Record<Asset, AssetSettingsData>;
  // Curva da banca da conta com todos os ativos salvos (cada um desde o próprio início), para a prévia combinada.
  combinedCurve: EquityPoint[];
};

export type SettingsPageData = Record<AccountType, AccountSettingsData>;

const ACCOUNTS: AccountType[] = ["SIMULADOR", "REAL"];

async function loadAsset(userId: string, account: AccountType, config: AccountRiskConfig): Promise<AssetSettingsData> {
  const [levelHistory, ruleHistory, bankrollCurve] = await Promise.all([
    getLevelHistory(userId, account, config.asset),
    getRuleHistory(userId, account, config.asset),
    config.saved ? loadBankrollCurve(userId, account, config.asset, config.bankrollStartDate) : Promise.resolve([]),
  ]);
  return { config, levelHistory, ruleHistory: [...ruleHistory].reverse(), bankrollCurve };
}

async function loadAccount(userId: string, account: AccountType, configs: AssetConfigs): Promise<AccountSettingsData> {
  const saved = ASSETS.map((asset) => configs[asset]).filter((config) => config.saved);
  const [assetData, combinedCurve] = await Promise.all([
    Promise.all(ASSETS.map((asset) => loadAsset(userId, account, configs[asset]))),
    saved.length > 1 ? loadUnitCurve(userId, account, sizingUnit(saved)) : Promise.resolve([]),
  ]);
  const assets = Object.fromEntries(ASSETS.map((asset, index) => [asset, assetData[index]])) as Record<Asset, AssetSettingsData>;
  return { assets, combinedCurve };
}

export async function loadSettingsPageData(userId: string, today: string): Promise<SettingsPageData> {
  const configs = await getAllRiskConfigs(userId, today);
  const [SIMULADOR, REAL] = await Promise.all(ACCOUNTS.map((account) => loadAccount(userId, account, configs[account])));
  return { SIMULADOR, REAL };
}
