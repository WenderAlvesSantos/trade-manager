import { deletePushSubscriptionAction, savePushSubscriptionAction, type PushSubscriptionInput } from "@/actions/push";

const SW_URL = "/sw.js";

export type PushStatus = "unsupported" | "denied" | "off" | "on";

// No iPhone/iPad o Web Push só existe com o app instalado na Tela de Início (modo standalone).
export const needsIosInstall = () =>
  typeof window !== "undefined" &&
  /iPhone|iPad|iPod/.test(navigator.userAgent) &&
  !window.matchMedia("(display-mode: standalone)").matches;

export const isPushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function vapidKey() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Chave pública VAPID não configurada.");
  const base64 = (key + "=".repeat((4 - (key.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return (await currentSubscription()) ? "on" : "off";
}

// Registra o service worker, pede permissão e salva a inscrição deste navegador no servidor.
export async function enablePush(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const registration = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey() }));

  const result = await savePushSubscriptionAction(subscription.toJSON() as PushSubscriptionInput);
  if (result.error) throw new Error(result.error);
  return "on";
}

export async function disablePush(): Promise<PushStatus> {
  const subscription = await currentSubscription();
  if (subscription) {
    await deletePushSubscriptionAction(subscription.endpoint);
    await subscription.unsubscribe();
  }
  return "off";
}
