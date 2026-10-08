import { loadAppAlerts } from "@/lib/app-alerts";
import { todayInSaoPaulo } from "@/lib/b3-calendar";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/web-push";

// Envia Web Push só para avisos ainda não enviados; NotificationSent evita repetição entre aparelhos.
export async function pushNewAlerts(userId: string) {
  const alerts = await loadAppAlerts(userId, todayInSaoPaulo());
  if (alerts.length === 0) return;

  const sent = await prisma.notificationSent.findMany({
    where: { userId, key: { in: alerts.map((alert) => alert.key) } },
    select: { key: true },
  });
  const sentKeys = new Set(sent.map((row) => row.key));
  const fresh = alerts.filter((alert) => !sentKeys.has(alert.key));
  if (fresh.length === 0) return;

  await prisma.notificationSent.createMany({
    data: fresh.map((alert) => ({ userId, key: alert.key })),
    skipDuplicates: true,
  });
  await Promise.all(
    fresh.map((alert) => sendPushToUser(userId, { title: alert.title, body: alert.body, url: alert.url, tag: alert.key })),
  );
}
