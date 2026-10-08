"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export type PushSubscriptionInput = z.input<typeof subscriptionSchema>;

// O endpoint é único por navegador; reinscrever (ou trocar de usuário no mesmo navegador) só atualiza o dono.
export async function savePushSubscriptionAction(input: PushSubscriptionInput) {
  const userId = await requireUserId();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "Inscrição de push inválida." };

  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, ...keys },
    update: { userId, ...keys },
  });
  return { success: true };
}

export async function deletePushSubscriptionAction(endpoint: string) {
  const userId = await requireUserId();
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}
