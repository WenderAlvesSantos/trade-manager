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

const accountSchema = z.enum(["SIMULADOR", "REAL"]);
const targetSchema = z.object({ account: accountSchema, asset: assetSchema });
// Banca da conta: as ações do Dashboard valem para todos os ativos que dividem a banca.
const unitSchema = z.object({ account: accountSchema, assets: z.array(assetSchema).min(1) });

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

// Grava risco e proteção como nova regra do ativo a partir de hoje (contratos não mudam). false = já era a regra.
async function adoptSizing(userId: string, account: AccountType, asset: Asset, sizing: z.infer<typeof sizingSchema>) {
  const today = todayInSaoPaulo();
  const current = await getRiskConfig(userId, account, asset, today);
  const next = { ...current, ...sizing };
  const ruleWrites = await ruleVersionWrites(userId, account, current, next, today);
  if (ruleWrites.length === 0) return false;

  await saveSettingsWithHistory(
    userId,
    account,
    asset,
    {
      ...riskValues(next),
      bankrollStartDate: new Date(current.bankrollStartDate),
      levelStartDate: new Date(current.levelStartDate),
    },
    null,
    ruleWrites,
  );
  return true;
}

// Botão "Adotar" da comparação: o risco e a proteção da linha passam a valer em cada ativo da banca.
export async function adoptSizingAction(
  account: AccountType,
  assets: Asset[],
  sizing: { riskPercent: number; drawdownLimit: number },
): Promise<FormState> {
  const userId = await requireUserId();
  const target = unitSchema.safeParse({ account, assets });
  const parsed = sizingSchema.safeParse(sizing);
  if (!target.success) return { error: "Conta ou ativo inválido." };
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const changed = [];
  for (const asset of target.data.assets) {
    if (await adoptSizing(userId, target.data.account, asset, parsed.data)) changed.push(asset);
  }
  if (changed.length === 0) return { error: "Essa já é a regra atual." };

  revalidatePath("/", "layout");
  return {
    success: `${changed.join(" + ")}: risco de ${parsed.data.riskPercent}% e proteção ${parsed.data.drawdownLimit > 0 ? `de ${parsed.data.drawdownLimit}%` : "desligada"} a partir de hoje.`,
  };
}

// Desfaz a mudança de regra feita hoje (adoção ou configuração) nos ativos da banca, voltando à versão anterior.
export async function undoTodayRuleAction(account: AccountType, assets: Asset[]): Promise<FormState> {
  const userId = await requireUserId();
  const target = unitSchema.safeParse({ account, assets });
  if (!target.success) return { error: "Conta ou ativo inválido." };

  const today = todayInSaoPaulo();
  const restored = [];
  for (const asset of target.data.assets) {
    const rule = await revertTodayRule(userId, target.data.account, asset, today);
    if (rule) restored.push(`${asset} (risco de ${rule.riskPercent}%)`);
  }
  if (restored.length === 0) return { error: "Nenhuma mudança de regra hoje para desfazer." };

  revalidatePath("/", "layout");
  return { success: `Regra anterior restaurada: ${restored.join(", ")}.` };
}

// Botão do card de banca: aplica os contratos sugeridos (subir/reduzir) em cada ativo e inicia um novo nível.
export async function applyContractsAction(account: AccountType, assets: Asset[], contracts: number): Promise<FormState> {
  const userId = await requireUserId();
  const target = unitSchema.safeParse({ account, assets });
  const parsedContracts = z.number().int().min(1).safeParse(contracts);
  if (!target.success || !parsedContracts.success) return { error: "Nível inválido." };

  const changed = [];
  for (const asset of target.data.assets) {
    const { current, levelStartDate, change } = await prepareLevel(userId, target.data.account, asset, parsedContracts.data, false);
    if (!change) continue;
    await saveSettingsWithHistory(
      userId,
      target.data.account,
      asset,
      {
        ...riskValues(current),
        contracts: parsedContracts.data,
        bankrollStartDate: new Date(current.bankrollStartDate),
        levelStartDate,
      },
      change,
    );
    changed.push(asset);
  }
  if (changed.length === 0) return { error: "Os ativos já estão com essa quantidade de contratos." };

  revalidatePath("/", "layout");
  return { success: `${changed.join(" + ")}: agora operando com ${parsedContracts.data} contrato(s).` };
}
