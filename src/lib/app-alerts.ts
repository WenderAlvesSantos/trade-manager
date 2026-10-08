import type { AccountType } from "@/generated/prisma/enums";
import { bankrollAlert, stopAlert, type AppAlert } from "@/lib/app-alert";
import { addDays } from "@/lib/b3-calendar";
import { loadBankrollStatus } from "@/lib/bankroll";
import { classifyDayDeviation } from "@/lib/day-deviation";
import { activeConfigs, getAccountRiskConfigs, type AccountRiskConfig } from "@/lib/risk-settings";
import { buildDaySummaries } from "@/lib/trade-aggregations";
import { getDailyAssetTotals } from "@/lib/trades";

// Janela curta para stops: o aviso é sobre o que acabou de acontecer, não sobre o histórico.
const STOP_LOOKBACK_DAYS = 7;
const ACCOUNTS: AccountType[] = ["SIMULADOR", "REAL"];

async function assetAlerts(userId: string, account: AccountType, config: AccountRiskConfig, today: string) {
  const [rows, bankroll] = await Promise.all([
    getDailyAssetTotals(userId, { account, asset: config.asset, from: addDays(today, -(STOP_LOOKBACK_DAYS - 1)), to: today }),
    loadBankrollStatus(userId, account, config),
  ]);

  const { ruleFor } = bankroll;
  const stops = buildDaySummaries(rows).flatMap((day) => {
    const rule = ruleFor(day.day);
    const deviation = classifyDayDeviation(rule, day.pointsByAsset);
    return deviation?.kind === "stop-excedido"
      ? [stopAlert(account, config.asset, day.day, deviation.points, rule.dailyStopLimit)]
      : [];
  });
  const sizing = bankrollAlert({ account, asset: config.asset, contracts: config.contracts }, bankroll.status);
  return sizing ? [...stops, sizing] : stops;
}

async function accountAlerts(userId: string, account: AccountType, today: string): Promise<AppAlert[]> {
  const configs = activeConfigs(await getAccountRiskConfigs(userId, account, today));
  const perAsset = await Promise.all(configs.map((config) => assetAlerts(userId, account, config, today)));
  return perAsset.flat();
}

// Stops excedidos recentes e sugestões de contratos pela banca, em cada conta e ativo operado.
export async function loadAppAlerts(userId: string, today: string) {
  const perAccount = await Promise.all(ACCOUNTS.map((account) => accountAlerts(userId, account, today)));
  return perAccount.flat();
}
