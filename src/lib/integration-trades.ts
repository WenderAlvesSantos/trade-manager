import { z } from "zod";
import { integrationUserSchema } from "@/lib/integration-users";
import { buildTradeData } from "@/lib/trade-calculations";
import { tradeSchema } from "@/lib/validations";

export const integrationTradeSchema = tradeSchema.extend({
  email: integrationUserSchema.shape.email,
  externalId: z.string().trim().regex(/^[a-zA-Z0-9_-]{8,100}$/, "Id externo inválido."),
});

export type IntegrationTrade = z.output<typeof integrationTradeSchema>;

export type TradeLaunchResult =
  | { status: "criado"; userId: string }
  | { status: "duplicado"; userId: string }
  | { status: "sem_usuario" };

export type TradeLaunchDeps = {
  findUserId: (email: string) => Promise<string | null>;
  /** Deve devolver false quando (userId, externalId) já existe — o trade já tinha sido lançado. */
  createTrade: (data: ReturnType<typeof buildTradeData> & { userId: string; externalId: string }) => Promise<boolean>;
};

/** Lança um trade vindo da Megan na conta do e-mail; reenvio do mesmo externalId não duplica. */
export async function launchTrade(
  { email, externalId, ...trade }: IntegrationTrade,
  deps: TradeLaunchDeps,
): Promise<TradeLaunchResult> {
  const userId = await deps.findUserId(email);
  if (!userId) return { status: "sem_usuario" };
  const created = await deps.createTrade({ ...buildTradeData(trade), userId, externalId });
  return { status: created ? "criado" : "duplicado", userId };
}
