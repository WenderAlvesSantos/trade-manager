"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { pushNewAlerts } from "@/lib/alert-push";
import { buildTradeData } from "@/lib/trade-calculations";
import {
  firstIssueMessage,
  tradeSchema,
  type FormState,
} from "@/lib/validations";

const MAX_TRADES_PER_BATCH = 100;

const tradeBatchSchema = z
  .array(tradeSchema)
  .min(1, "Adicione ao menos um trade.")
  .max(MAX_TRADES_PER_BATCH, `Máximo de ${MAX_TRADES_PER_BATCH} trades por vez.`);

export type TradeRowInput = Record<keyof z.input<typeof tradeSchema>, string>;

function batchIssueMessage(error: z.ZodError) {
  const issue = error.issues[0];
  const row = typeof issue?.path[0] === "number" ? issue.path[0] + 1 : null;
  const message = issue?.message ?? "Dados inválidos.";
  return row ? `Linha ${row}: ${message}` : message;
}

export async function createTradesAction(rows: TradeRowInput[]): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = tradeBatchSchema.safeParse(rows);
  if (!parsed.success) return { error: batchIssueMessage(parsed.error) };

  const { count } = await prisma.trade.createMany({
    data: parsed.data.map((trade) => ({ ...buildTradeData(trade), userId })),
  });
  revalidatePath("/", "layout");
  after(() => pushNewAlerts(userId));
  return { success: `${count} trade(s) registrado(s) com sucesso.` };
}

export async function updateTradeAction(
  tradeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = tradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { count } = await prisma.trade.updateMany({
    where: { id: tradeId, userId },
    data: buildTradeData(parsed.data),
  });
  if (count === 0) return { error: "Trade não encontrado." };

  revalidatePath("/", "layout");
  after(() => pushNewAlerts(userId));
  return { success: "Trade atualizado com sucesso." };
}

export async function deleteTradeAction(tradeId: string) {
  const userId = await requireUserId();
  await prisma.trade.deleteMany({ where: { id: tradeId, userId } });
  revalidatePath("/", "layout");
}
