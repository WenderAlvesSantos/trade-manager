"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, notification } from "antd";
import type { AppAlert } from "@/lib/app-alert";
import { enablePush, getPushStatus } from "@/lib/push-client";

const STORAGE_KEY = "megan:alerts-notified";

function readNotified(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function saveNotified(keys: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
}

// Avisos dentro do app (stop excedido, contratos pela banca), uma vez por chave neste navegador. Com o app fechado, vem o Web Push.
export function AlertNotifier({ alerts }: { alerts: AppAlert[] }) {
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    const notified = readNotified();
    const fresh = alerts.filter((alert) => !notified.has(alert.key));
    if (fresh.length === 0) return;

    fresh.forEach((alert) => notified.add(alert.key));
    saveNotified(notified);

    void getPushStatus().then((status) => {
      for (const alert of fresh) {
        api[alert.severity]({
          key: alert.key,
          title: alert.title,
          description: (
            <span className="text-sm">
              {alert.body}{" "}
              <Link href={alert.url} onClick={() => api.destroy(alert.key)}>
                Ver
              </Link>
            </span>
          ),
          duration: 0,
          actions:
            status === "off" ? (
              <Button size="small" onClick={() => void enablePush()}>
                Avisar também com o app fechado
              </Button>
            ) : undefined,
        });
      }
    });
  }, [alerts, api]);

  return contextHolder;
}
