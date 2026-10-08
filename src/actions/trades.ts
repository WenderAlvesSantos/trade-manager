"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { calculateTradeResult } from "@/lib/trade-calculations";
import {
  firstIssueMessage,
  tradeSchema,
  type FormState,
} from "@/lib/validations";

function parseTradeForm(formData: FormData) {
  const parsed = tradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { date, asset, contracts, points } = parsed.data;
  return {
    data: {
      date: new Date(date),
      asset,
      contracts,
      points,
      ...calculateTradeResult({ asset, contracts, points }),
    },
  };
}

export async function createTradeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = parseTradeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data } = parsed;
  await prisma.trade.create({ data: { ...data, userId } });
  revalidatePath("/");
  return { success: "Trade registrado com sucesso." };
}

export async function updateTradeAction(
  tradeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = parseTradeForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data } = parsed;
  const { count } = await prisma.trade.updateMany({
    where: { id: tradeId, userId },
    data,
  });
  if (count === 0) return { error: "Trade não encontrado." };

  revalidatePath("/");
  return { success: "Trade atualizado com sucesso." };
}

export async function deleteTradeAction(tradeId: string) {
  const userId = await requireUserId();
  await prisma.trade.deleteMany({ where: { id: tradeId, userId } });
  revalidatePath("/");
}
