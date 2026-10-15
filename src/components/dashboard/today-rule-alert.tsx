"use client";

import { useTransition } from "react";
import { Alert, App, Button, Popconfirm } from "antd";
import { undoTodayRuleAction } from "@/actions/risk-settings";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { ruleChanges } from "@/lib/rule-changes";

// Mudanças de regra feitas hoje em cada ativo da banca (adoção ou configuração), com opção de voltar à anterior.
function todayChanges(data: RiskDashboardData) {
  const combined = data.assetRuleHistories.length > 1;
  return data.assetRuleHistories.flatMap(({ asset, history }) => {
    const change = ruleChanges(history, data.today).find((item) => item.day === data.today);
    if (!change) return [];
    return [{ asset, text: `${combined ? `${asset}: ` : ""}${change.changes.join(", ")}` }];
  });
}

export function TodayRuleAlert({ data }: { data: RiskDashboardData }) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const changes = todayChanges(data);
  if (changes.length === 0) return null;

  function undo() {
    startTransition(async () => {
      const result = await undoTodayRuleAction(data.account, changes.map((change) => change.asset));
      if (result?.error) message.error(result.error);
      else message.success(result?.success);
    });
  }

  return (
    <Alert
      type="info"
      showIcon
      title={`Regra alterada hoje: ${changes.map((change) => change.text).join(" · ")}`}
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
