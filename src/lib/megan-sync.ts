import type { AccountType } from "@/generated/prisma/enums";
import { loadBankrollStatus } from "@/lib/bankroll";
import { prepareLevel, saveSettingsWithHistory } from "@/lib/level-history";
import { meganBankrollReply, meganRiskRows } from "@/lib/megan-risk";
import { prisma } from "@/lib/prisma";
import { activeConfigs, getAccountRiskConfigs, riskValues } from "@/lib/risk-settings";
import { sizingUnit } from "@/lib/sizing-unit";

/** Cria a configuração da Megan no WIN das contas que ainda não têm; nunca altera uma existente. Devolve quantas criou. */
export async function ensureMeganSettings(userId: string, today: string, accounts?: AccountType[]) {
  const rows = meganRiskRows(userId, today).filter((row) => !accounts || accounts.includes(row.accountType));
  const { count } = await prisma.riskSettings.createMany({ data: rows, skipDuplicates: true });
  return count;
}

export type MeganChanges = { initialBankroll?: number; contracts?: number };

/** Banca inicial (vale a partir de hoje) e/ou contratos operados (novo nível no histórico) do WIN na conta. */
export async function applyMeganChanges(userId: string, account: AccountType, changes: MeganChanges, today: string) {
  if (changes.initialBankroll === undefined && changes.contracts === undefined) return false;
  await ensureMeganSettings(userId, today, [account]);

  if (changes.initialBankroll !== undefined) {
    await prisma.riskSettings.update({
      where: { userId_accountType_asset: { userId, accountType: account, asset: "WIN" } },
      data: { initialBankroll: changes.initialBankroll, bankrollStartDate: new Date(today) },
    });
  }
  if (changes.contracts !== undefined) {
    const { current, levelStartDate, change } = await prepareLevel(userId, account, "WIN", changes.contracts, false);
    if (change) {
      await saveSettingsWithHistory(
        userId,
        account,
        "WIN",
        {
          ...riskValues(current),
          contracts: changes.contracts,
          bankrollStartDate: new Date(current.bankrollStartDate),
          levelStartDate,
        },
        change,
      );
    }
  }
  return true;
}

/** Banca atual e contratos sugeridos da conta, como no card de banca do painel. null = nenhum ativo operado. */
export async function meganBankroll(userId: string, account: AccountType, today: string) {
  const configs = activeConfigs(await getAccountRiskConfigs(userId, account, today));
  if (configs.length === 0) return null;
  const unit = sizingUnit(configs);
  const { status } = await loadBankrollStatus(userId, account, unit);
  return meganBankrollReply(unit.config, status);
}
