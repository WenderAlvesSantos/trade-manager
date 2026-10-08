"use client";

import { useSyncExternalStore } from "react";
import { BellOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Tag } from "antd";
import { usePushStatus } from "@/components/shared/use-push-status";
import { needsIosInstall } from "@/lib/push-client";

const STATUS_TAG = {
  on: { color: "green", label: "Ativado neste navegador" },
  off: { color: "default", label: "Desativado neste navegador" },
  denied: { color: "red", label: "Bloqueado pelo navegador" },
  unsupported: { color: "default", label: "Navegador sem suporte" },
} as const;

const noop = () => () => {};

function StatusHint({ status }: { status: keyof typeof STATUS_TAG | null }) {
  const iosInstall = useSyncExternalStore(noop, needsIosInstall, () => false);
  if (iosInstall) {
    return (
      <Alert
        className="mt-3"
        type="info"
        showIcon
        title="No iPhone, instale o app primeiro"
        description="No Safari, toque em Compartilhar → Adicionar à Tela de Início. Abra o Megan pelo ícone e ative os avisos aqui."
      />
    );
  }
  if (status === "denied") {
    return <Alert className="mt-3" type="warning" showIcon title="Libere as notificações deste site nas configurações do navegador." />;
  }
  return null;
}

export function PushSettingsCard() {
  const { status, busy, error, enable, disable } = usePushStatus();

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <BellOutlined /> Avisos (stop excedido e contratos pela banca)
        </span>
      }
      extra={status && <Tag color={STATUS_TAG[status].color}>{STATUS_TAG[status].label}</Tag>}
    >
      <p className="text-sm text-white/65">
        Ao registrar um dia em que a perda passou do stop global (além da tolerância) ou quando a banca comportar mais ou
        menos contratos do que você opera, todos os aparelhos ativados recebem uma notificação, mesmo com o app fechado.
        Ative em cada navegador ou celular que quiser avisar.
      </p>
      <StatusHint status={status} />
      {error && <Alert className="mt-3" type="error" showIcon title={error} />}
      <div className="mt-4">
        {status === "on" ? (
          <Button onClick={disable} loading={busy}>
            Desativar neste navegador
          </Button>
        ) : (
          <Button type="primary" onClick={enable} loading={busy} disabled={status !== "off"}>
            Ativar neste navegador
          </Button>
        )}
      </div>
    </Card>
  );
}
