import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const tradeSchema = z.object({
  date: z.iso.date("Informe uma data válida."),
  accountType: z.enum(["SIMULADOR", "REAL"], "Selecione o tipo de conta."),
  asset: z.enum(["WIN", "WDO"], "Selecione WIN ou WDO."),
  contracts: z.coerce
    .number()
    .int("Contratos deve ser um número inteiro.")
    .positive("Informe ao menos 1 contrato."),
  points: z.coerce.number("Informe os pontos (use negativo para prejuízo)."),
});

const points = (label: string) =>
  z.number(`Informe ${label}.`).positive(`${label} deve ser maior que zero.`).max(100000);
const wholeNumber = (label: string, min = 1) =>
  z.number(`Informe ${label}.`).int(`${label} deve ser inteiro.`).min(min, `${label}: mínimo ${min}.`).max(100000);

const money = (label: string) => z.number(`Informe ${label}.`).min(0, `${label} não pode ser negativo.`).max(100_000_000);

export const assetSchema = z.enum(["WIN", "WDO"], "Selecione WIN ou WDO.");

export const riskSettingsSchema = z.object({
  active: z.boolean(),
  contracts: wholeNumber("Contratos"),
  dailyGainTarget: wholeNumber("Meta global"),
  dailyStopLimit: wholeNumber("Stop global"),
  tradeTarget: wholeNumber("Alvo por trade"),
  tradeStop: wholeNumber("Stop por trade"),
  projectedGainDay: points("Resultado projetado do dia de meta"),
  projectedLossDay: points("Resultado projetado do dia de stop"),
  avgTradesPerDay: wholeNumber("Trades por dia"),
  deviationTolerance: wholeNumber("Tolerância de desvio", 0),
  initialBankroll: money("Banca inicial"),
  bankrollStartDate: z.iso.date("Informe a data de início da banca."),
  marginPerContract: money("Margem por contrato"),
  riskPercent: z
    .number("Informe o risco por dia de stop.")
    .positive("Risco por dia de stop deve ser maior que zero.")
    .max(100, "Risco por dia de stop: máximo 100%."),
  drawdownLimit: z
    .number("Informe o limite de queda desde o pico.")
    .min(0, "Limite de queda não pode ser negativo.")
    .max(99, "Limite de queda: máximo 99%."),
  maxContracts: wholeNumber("Máximo de contratos", 0),
  increaseBuffer: wholeNumber("Folga para subir", 0).max(20, "Folga para subir: máximo 20 stops."),
});

export type RiskSettingsInput = z.input<typeof riskSettingsSchema>;

export type FormState = { error?: string; success?: string } | undefined;

export function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
