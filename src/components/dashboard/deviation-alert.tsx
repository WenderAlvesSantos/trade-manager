"use client";

import { Alert } from "antd";
import { daysLabel, DeviationTags } from "@/components/shared/deviation-tags";
import { formatDate } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";

// Contador mensal de dias que fugiram da meta/stop do robô além da tolerância configurada.
export function DeviationAlert({ data }: { data: RiskDashboardData }) {
  const { deviations, deviationCounts: counts, config, monthLabel, realizedDays } = data;
  if (realizedDays === 0) return null;

  if (counts.total === 0) {
    return (
      <Alert
        type="success"
        showIcon
        title={`Nenhum dia fora do esperado em ${monthLabel} (${daysLabel(realizedDays)} operado(s), tolerância de ${config.deviationTolerance} pts)`}
      />
    );
  }

  return (
    <Alert
      type={counts["stop-excedido"] > 0 ? "error" : "warning"}
      showIcon
      title={
        <span className="flex flex-wrap items-center gap-2">
          {daysLabel(counts.total)} fora do esperado em {monthLabel} de {realizedDays} operado(s)
          <DeviationTags counts={counts} />
        </span>
      }
      description={
        <ul className="mt-1 flex flex-col gap-0.5 text-sm">
          {deviations.map((item) => (
            <li key={item.day}>
              <span className="font-medium">{formatDate(item.day)}</span> — {item.message}
            </li>
          ))}
        </ul>
      }
    />
  );
}
