import type { AccountType } from "@/generated/prisma/enums";
import { loadBankrollStatus } from "@/lib/bankroll";
import { prepareLevel, saveSettingsWithHistory } from "@/lib/level-history";
import { MEGAN_ACCOUNTS, meganBankrollReply, meganRiskRows, meganValuesOver } from "@/lib/megan-risk";
import { prisma } from "@/lib/prisma";
import { ruleVersionWrites } from "@/lib/risk-rules";
import { activeConfigs, getAccountRiskConfigs, getRiskConfig, riskValues } from "@/lib/risk-settings";
import { sizingUnit } from "@/lib/sizing-unit";

/** Cria a configuração da Megan no WIN das contas que ainda não têm; nunca altera uma existente. Devolve quantas criou. */
export async function ensureMeganSettings(userId: string, today: string, accounts?: AccountType[]) {
  const rows = meganRiskRows(userId, today).filter((row) => !accounts || accounts.includes(row.accountType));
  const { count } = await prisma.riskSettings.createMany({ data: rows, skipDuplicates: true });
  return count;
}

/**
 * Admin, um cliente: aplica a configuração da Megan no WIN do Real e do Simulador, inclusive sobre a existente
 * (regras viram as da Megan, registradas no histórico de regras; contratos e banca ficam). Devolve quantas contas aplicou.
 */
export async function applyMeganSettings(userId: string, today: string) {
  for (const account of MEGAN_ACCOUNTS) {
    const current = await getRiskConfig(userId, account, "WIN", today);
    if (!current.saved) {
      await ensureMeganSettings(userId, today, [account]);
      continue;
    }
    const { values, resetBankroll } = meganValuesOver(current);
    const ruleWrites = await ruleVersionWrites(userId, account, current, { ...values, asset: "WIN" }, today);
    await saveSettingsWithHistory(
      userId,
      account,
      "WIN",
      {
        ...values,
        levelStartDate: new Date(current.levelStartDate),
        bankrollStartDate: resetBankroll ? new Date(today) : new Date(current.bankrollStartDate),
        ...(resetBankroll ? { bankrollConfirmedAt: null } : {}),
      },
      null,
      ruleWrites,
    );
  }
  return MEGAN_ACCOUNTS.length;
}

export type MeganChanges = { initialBankroll?: number; contracts?: number; confirmBankroll?: boolean };

const winKey = (userId: string, account: AccountType) => ({ userId_accountType_asset: { userId, accountType: account, asset: "WIN" as const } });

/**
 * Banca inicial (vale a partir de hoje, já confirmada), confirmação da banca padrão (valor e data de início
 * não mudam) e/ou contratos operados (novo nível no histórico) do WIN na conta.
 */
export async function applyMeganChanges(userId: string, account: AccountType, changes: MeganChanges, today: string) {
  const { initialBankroll, contracts, confirmBankroll } = changes;
  if (initialBankroll === undefined && contracts === undefined && !confirmBankroll) return false;
  await ensureMeganSettings(userId, today, [account]);

  if (initialBankroll !== undefined) {
    await prisma.riskSettings.update({
      where: winKey(userId, account),
      data: { initialBankroll, bankrollStartDate: new Date(today), bankrollConfirmedAt: new Date() },
    });
  } else if (confirmBankroll) {
    await prisma.riskSettings.updateMany({
      where: { userId, accountType: account, asset: "WIN", bankrollConfirmedAt: null },
      data: { bankrollConfirmedAt: new Date() },
    });
  }
  if (contracts !== undefined) {
    const { current, levelStartDate, change } = await prepareLevel(userId, account, "WIN", contracts, false);
    if (change) {
      await saveSettingsWithHistory(
        userId,
        account,
        "WIN",
        {
          ...riskValues(current),
          contracts,
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
  const [{ status }, win] = await Promise.all([
    loadBankrollStatus(userId, account, unit),
    prisma.riskSettings.findUnique({ where: winKey(userId, account), select: { bankrollConfirmedAt: true } }),
  ]);
  return meganBankrollReply(unit.config, status, Boolean(win?.bankrollConfirmedAt));
}
