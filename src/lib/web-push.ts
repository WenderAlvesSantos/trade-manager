import webpush, { WebPushError } from "web-push";
import { prisma } from "@/lib/prisma";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

let configured: boolean | null = null;

// Sem as variáveis VAPID (ex.: ambiente de teste) o envio vira no-op em vez de quebrar a action.
function ensureConfigured() {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  configured = Boolean(publicKey && privateKey && subject);
  if (configured) webpush.setVapidDetails(subject!, publicKey!, privateKey!);
  else console.warn("[web-push] VAPID não configurado; pushes desativados.");
  return configured;
}

const isGone = (error: unknown) => error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410);

// Envia para todos os aparelhos do usuário e remove inscrições expiradas.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) return;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  const body = JSON.stringify(payload);

  const expired: string[] = [];
  await Promise.all(
    subscriptions.map(async ({ endpoint, p256dh, auth }) => {
      try {
        await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, body);
      } catch (error) {
        if (isGone(error)) expired.push(endpoint);
        else console.error("[web-push] falha ao enviar", error);
      }
    }),
  );
  if (expired.length > 0) await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } });
}
