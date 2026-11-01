import { z } from "zod";
import type { AccountType } from "@/generated/prisma/enums";
import type { BankrollStatus } from "@/lib/bankroll-sizing";
import { integrationUserSchema } from "@/lib/integration-users";
import type { RiskConfig } from "@/lib/risk-projection";
import type { RiskValues } from "@/lib/risk-settings";

// Megan C/D no WIN, calibrada no backtest jun–out/26: dia de stop fecha perto de −300 (stop −250 checado no
// fechamento do trade, pior −350), 1 stop a cada ~5 pregões, ~6 trades/dia e dia sem stop em média +268
// (projeção usa +200 por segurança). Risco 10% aguenta a pior queda do período (~1.010 pts) com ~32% da banca.
export const MEGAN_WIN_RISK: RiskValues = {
  active: true,
  contracts: 1,
  dailyGainTarget: 600,
  dailyStopLimit: 300,
  tradeTarget: 140,
  tradeStop: 130,
  projectedGainDay: 200,
  projectedLossDay: 300,
  avgTradesPerDay: 6,
  deviationTolerance: 50,
  initialBankroll: 0,
  marginPerContract: 155,
  riskPercent: 10,
  drawdownLimit: 25,
  maxContracts: 150,
  increaseBuffer: 3,
};

export const MEGAN_ACCOUNTS: AccountType[] = ["REAL", "SIMULADOR"];

/** RiskSettings do WIN numa conta com a configuração da Megan (banca 0 = ainda não informada). */
export function meganRiskRow(userId: string, accountType: AccountType, today: string, initialBankroll = 0) {
  const day = new Date(today);
  return {
    ...MEGAN_WIN_RISK,
    initialBankroll,
    userId,
    accountType,
    asset: "WIN" as const,
    levelStartDate: day,
    bankrollStartDate: day,
  };
}

/** Conta nova: WIN no Real e no Simulador. */
export const meganRiskRows = (userId: string, today: string) =>
  MEGAN_ACCOUNTS.map((accountType) => meganRiskRow(userId, accountType, today));

export const bankrollSyncSchema = z.object({
  email: integrationUserSchema.shape.email,
  accountType: z.enum(["SIMULADOR", "REAL"], "Conta inválida."),
  // Ausente = só consulta a sugestão; presente = grava como banca inicial a partir de hoje.
  initialBankroll: z.number("Banca inválida.").positive("Informe a banca inicial.").max(100_000_000).optional(),
  // Contratos com que a Megan iniciou no ao vivo: vira o nível atual (histórico de subida/redução).
  contracts: z.number("Contratos inválidos.").int("Contratos inválidos.").min(1).max(100_000).optional(),
});

export const MEGAN_BATCH_MAX = 50;

export const meganDefaultsBatchSchema = z.object({
  emails: z.array(integrationUserSchema.shape.email).min(1).max(MEGAN_BATCH_MAX),
});

export type MeganDefaultsResult = { aplicados: string[]; jaTinham: string[]; semConta: string[] };

/**
 * Clientes antigos: cria a configuração da Megan (WIN Real + Simulador) onde ainda não existe.
 * `ensure` devolve quantas configurações criou para o usuário (0 = ele já tinha as duas).
 */
export async function applyMeganDefaults(
  emails: string[],
  deps: { findUserId: (email: string) => Promise<string | null>; ensure: (userId: string) => Promise<number> },
): Promise<MeganDefaultsResult> {
  const result: MeganDefaultsResult = { aplicados: [], jaTinham: [], semConta: [] };
  for (const email of [...new Set(emails)]) {
    const userId = await deps.findUserId(email);
    if (!userId) result.semConta.push(email);
    else if ((await deps.ensure(userId)) > 0) result.aplicados.push(email);
    else result.jaTinham.push(email);
  }
  return result;
}

export type MeganBankrollReply = {
  status: "ok";
  configured: boolean;
  bankroll: number;
  contracts: number;
  suggestedContracts: number;
  maxContracts: number;
  stopCostPerContract: number;
  protecting: boolean;
};

/** Resumo que a Megan mostra: banca atual e quantos contratos o gerenciamento recomenda. */
export function meganBankrollReply(config: Pick<RiskConfig, "contracts" | "maxContracts">, status: BankrollStatus): MeganBankrollReply {
  return {
    status: "ok",
    configured: status.configured,
    bankroll: status.bankroll,
    contracts: config.contracts,
    suggestedContracts: status.configured ? status.suggestedContracts : 0,
    maxContracts: config.maxContracts,
    stopCostPerContract: status.stopCostPerContract,
    protecting: status.protecting,
  };
}
