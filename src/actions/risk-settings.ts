"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AccountType, Asset } from "@/generated/prisma/enums";
import { todayInSaoPaulo } from "@/lib/b3-calendar";
import { reasonFor, saveSettingsWithHistory, type LevelChange } from "@/lib/level-history";
import { revertTodayRule, ruleVersionWrites } from "@/lib/risk-rules";
import { getRiskConfig, riskValues } from "@/lib/risk-settings";
import { requireUserId } from "@/lib/session";
import { assetSchema, firstIssueMessage, riskSettingsSchema, type FormState, type RiskSettingsInput } from "@/lib/validations";

const targetSchema = z.object({ account: z.enum(["SIMULADOR", "REAL"]), asset: assetSchema });

// Mudar a quantidade de contratos encerra o nível atual (registrado no histórico) e inicia outro hoje.
async function prepareLevel(userId: string, account: AccountType, asset: Asset, contracts: number, manual: boolean) {
  const today = todayInSaoPaulo();
  const current = await getRiskConfig(userId, account, asset, today);
  if (current.contracts === contracts) {
    return { today, current, levelStartDate: new Date(current.levelStartDate), change: null };
  }

  const change: LevelChange = {
    date: today,
    fromContracts: current.contracts,
    toContracts: contracts,
    reason: reasonFor(current.contracts, contracts, manual),
    previousLevelStart: current.levelStartDate,
  };
  return { today, current, levelStartDate: new Date(today), change };
}

export async function saveRiskSettingsAction(account: AccountType, asset: Asset, input: RiskSettingsInput): Promise<FormState> {
  const userId = await requireUserId();
  const target = targetSchema.safeParse({ account, asset });
  const parsed = riskSettingsSchema.safeParse(input);
  if (!target.success) return { error: "Conta ou ativo inválido." };
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { account: accountType, asset: assetType } = target.data;
  const { bankrollStartDate, ...values } = parsed.data;
  const { today, current, levelStartDate, change } = await prepareLevel(userId, accountType, assetType, values.contracts, true);
  const ruleWrites = await ruleVersionWrites(userId, accountType, current, { ...values, asset: assetType }, today);
  await saveSettingsWithHistory(
    userId,
    accountType,
    assetType,
    { ...values, bankrollStartDate: new Date(bankrollStartDate), levelStartDate },
    change,
    ruleWrites,
  );

  revalidatePath("/", "layout");
  return { success: `Configuração de ${assetType} salva.` };
}

const sizingSchema = riskSettingsSchema.pick({ riskPercent: true, drawdownLimit: true });

// Botão "Adotar" da comparação: grava risco e proteção como nova regra a partir de hoje (contratos não mudam).
export async function adoptSizingAction(
  account: AccountType,
  asset: Asset,
  sizing: { riskPercent: number; drawdownLimit: number },
): Promise<FormState> {
  const userId = await requireUserId();
  const target = targetSchema.safeParse({ account, asset });
  const parsed = sizingSchema.safeParse(sizing);
  if (!target.success) return { error: "Conta ou ativo inválido." };
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { account: accountType, asset: assetType } = target.data;
  const today = todayInSaoPaulo();
  const current = await getRiskConfig(userId, accountType, assetType, today);
  const next = { ...current, ...parsed.data };
  const ruleWrites = await ruleVersionWrites(userId, accountType, current, next, today);
  if (ruleWrites.length === 0) return { error: "Essa já é a regra atual." };

  await saveSettingsWithHistory(
    userId,
    accountType,
    assetType,
    {
      ...riskValues(next),
      bankrollStartDate: new Date(current.bankrollStartDate),
      levelStartDate: new Date(current.levelStartDate),
    },
    null,
    ruleWrites,
  );

  revalidatePath("/", "layout");
  return {
    success: `${assetType}: risco de ${parsed.data.riskPercent}% e proteção ${parsed.data.drawdownLimit > 0 ? `de ${parsed.data.drawdownLimit}%` : "desligada"} a partir de hoje.`,
  };
}

// Desfaz a mudança de regra feita hoje (adoção ou configuração), voltando à versão anterior.
export async function undoTodayRuleAction(account: AccountType, asset: Asset): Promise<FormState> {
  const userId = await requireUserId();
  const target = targetSchema.safeParse({ account, asset });
  if (!target.success) return { error: "Conta ou ativo inválido." };

  const restored = await revertTodayRule(userId, target.data.account, target.data.asset, todayInSaoPaulo());
  if (!restored) return { error: "Nenhuma mudança de regra hoje para desfazer." };

  revalidatePath("/", "layout");
  return { success: `${target.data.asset}: regra anterior restaurada (risco de ${restored.riskPercent}%).` };
}

// Botão do card de banca: aplica os contratos sugeridos (subir/reduzir) e inicia um novo nível.
export async function applyContractsAction(account: AccountType, asset: Asset, contracts: number): Promise<FormState> {
  const userId = await requireUserId();
  const target = targetSchema.safeParse({ account, asset });
  const parsedContracts = z.number().int().min(1).safeParse(contracts);
  if (!target.success || !parsedContracts.success) return { error: "Nível inválido." };

  const { account: accountType, asset: assetType } = target.data;
  const { current, levelStartDate, change } = await prepareLevel(userId, accountType, assetType, parsedContracts.data, false);
  if (!change) return { error: "O ativo já está com essa quantidade de contratos." };

  await saveSettingsWithHistory(
    userId,
    accountType,
    assetType,
    {
      ...riskValues(current),
      contracts: parsedContracts.data,
      bankrollStartDate: new Date(current.bankrollStartDate),
      levelStartDate,
    },
    change,
  );

  revalidatePath("/", "layout");
  return { success: `${assetType}: agora operando com ${parsedContracts.data} contrato(s).` };
}
