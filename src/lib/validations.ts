import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const registerSchema = credentialsSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

export const tradeSchema = z.object({
  date: z.iso.date("Informe uma data válida."),
  asset: z.enum(["WIN", "WDO"], "Selecione WIN ou WDO."),
  contracts: z.coerce
    .number()
    .int("Contratos deve ser um número inteiro.")
    .positive("Informe ao menos 1 contrato."),
  points: z.coerce.number("Informe os pontos (use negativo para prejuízo)."),
});

export type FormState = { error?: string; success?: string } | undefined;

export function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
