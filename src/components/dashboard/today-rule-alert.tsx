"use client";

import { useTransition } from "react";
import { Alert, App, Button, Popconfirm } from "antd";
import { undoTodayRuleAction } from "@/actions/risk-settings";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { ruleChanges } from "@/lib/rule-changes";

// Mudança de regra feita hoje (adoção ou configuração), com opção de voltar à versão anterior.
export function TodayRuleAlert({ data }: { data: RiskDashboardData }) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const change = ruleChanges(data.ruleHistory, data.today).find((item) => item.day === data.today);
  if (!change) return null;

  function undo() {
    startTransition(async () => {
      const result = await undoTodayRuleAction(data.account, data.config.asset);
      if (result?.error) message.error(result.error);
      else message.success(result?.success);
    });
  }

  return (
    <Alert
      type="info"
      showIcon
      title={`Regra alterada hoje: ${change.changes.join(", ")}`}
      action={
        <Popconfirm
          title="Desfazer a mudança de hoje?"
          description="A regra volta à versão anterior e a versão de hoje é apagada."
          okText="Desfazer"
          cancelText="Cancelar"
          onConfirm={undo}
        >
          <Button size="small" loading={isPending}>
            Desfazer
          </Button>
        </Popconfirm>
      }
    />
  );
}
