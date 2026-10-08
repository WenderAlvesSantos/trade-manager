import type { AccountType, Asset } from "@/generated/prisma/enums";
import { loadBankrollCurve } from "@/lib/bankroll";
import type { DatedRule } from "@/lib/day-deviation";
import { getLevelHistory, type LevelHistoryEntry } from "@/lib/level-history";
import { getRuleHistory } from "@/lib/risk-rules";
import { ASSETS } from "@/lib/risk-projection";
import { getAllRiskConfigs, type AccountRiskConfig } from "@/lib/risk-settings";
import type { EquityPoint } from "@/lib/trade-aggregations";

export type AssetSettingsData = {
  config: AccountRiskConfig;
  levelHistory: LevelHistoryEntry[];
  // Mais recente primeiro.
  ruleHistory: DatedRule[];
  // Líquido real acumulado por dia desde o início da banca salva (a prévia recalcula banca, pico e proteção).
  bankrollCurve: EquityPoint[];
};

export type SettingsPageData = Record<AccountType, Record<Asset, AssetSettingsData>>;

const ACCOUNTS: AccountType[] = ["SIMULADOR", "REAL"];

async function loadAsset(userId: string, account: AccountType, config: AccountRiskConfig): Promise<AssetSettingsData> {
  const [levelHistory, ruleHistory, bankrollCurve] = await Promise.all([
    getLevelHistory(userId, account, config.asset),
    getRuleHistory(userId, account, config.asset),
    config.saved ? loadBankrollCurve(userId, account, config.asset, config.bankrollStartDate) : Promise.resolve([]),
  ]);
  return { config, levelHistory, ruleHistory: [...ruleHistory].reverse(), bankrollCurve };
}

export async function loadSettingsPageData(userId: string, today: string): Promise<SettingsPageData> {
  const configs = await getAllRiskConfigs(userId, today);
  const entries = await Promise.all(
    ACCOUNTS.flatMap((account) =>
      ASSETS.map(async (asset) => [account, asset, await loadAsset(userId, account, configs[account][asset])] as const),
    ),
  );

  const data = { SIMULADOR: {}, REAL: {} } as SettingsPageData;
  for (const [account, asset, assetData] of entries) data[account][asset] = assetData;
  return data;
}
