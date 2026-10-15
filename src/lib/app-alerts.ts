import type { AccountType } from "@/generated/prisma/enums";
import { bankrollAlert, nearIncreaseAlert, stopAlert, type AppAlert } from "@/lib/app-alert";
import { addDays } from "@/lib/b3-calendar";
import { loadBankrollStatus } from "@/lib/bankroll";
import { classifyDayDeviation } from "@/lib/day-deviation";
import { gainDaysToIncrease } from "@/lib/month-ladder";
import { activeConfigs, getAccountRiskConfigs } from "@/lib/risk-settings";
import { sizingUnit, unitAsset } from "@/lib/sizing-unit";
import { buildDaySummaries } from "@/lib/trade-aggregations";
import { getDailyAssetTotals } from "@/lib/trades";

// Janela curta para stops: o aviso é sobre o que acabou de acontecer, não sobre o histórico.
const STOP_LOOKBACK_DAYS = 7;
const ACCOUNTS: AccountType[] = ["SIMULADOR", "REAL"];

// Stops excedidos em cada ativo e sugestões de contratos pela banca da conta (única para os ativos operados).
async function accountAlerts(userId: string, account: AccountType, today: string): Promise<AppAlert[]> {
  const configs = activeConfigs(await getAccountRiskConfigs(userId, account, today));
  if (configs.length === 0) return [];
  const unit = sizingUnit(configs);
  const [rows, bankroll] = await Promise.all([
    getDailyAssetTotals(userId, { account, asset: unitAsset(unit), from: addDays(today, -(STOP_LOOKBACK_DAYS - 1)), to: today }),
    loadBankrollStatus(userId, account, unit),
  ]);

  const stops = buildDaySummaries(rows).flatMap((day) =>
    bankroll.rules.assetRules.flatMap(({ asset, ruleFor }) => {
      const rule = ruleFor(day.day);
      const deviation = classifyDayDeviation(rule, day.pointsByAsset);
      return deviation?.kind === "stop-excedido" ? [stopAlert(account, asset, day.day, deviation.points, rule.dailyStopLimit)] : [];
    }),
  );
  const { config } = unit;
  const context = { account, label: unit.label, asset: unitAsset(unit), contracts: config.contracts, increaseBuffer: config.increaseBuffer };
  const gainDays = gainDaysToIncrease(config, bankroll.status.bankroll, bankroll.drawdown, config.contracts);
  const sizing = [bankrollAlert(context, bankroll.status), nearIncreaseAlert(context, bankroll.status, gainDays)];
  return [...stops, ...sizing.filter((alert) => alert !== null)];
}

// Stops excedidos recentes e sugestões de contratos pela banca, em cada conta.
export async function loadAppAlerts(userId: string, today: string) {
  const perAccount = await Promise.all(ACCOUNTS.map((account) => accountAlerts(userId, account, today)));
  return perAccount.flat();
}
