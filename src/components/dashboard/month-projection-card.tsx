"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarOutlined } from "@ant-design/icons";
import { Card, Divider, Segmented, Statistic } from "antd";
import { formatCurrency } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { resultHex } from "@/lib/theme";
import {
  DEFAULT_SCENARIO,
  findAverageScenario,
  findStopScenario,
  parseScenarioKey,
  scenarioOptions,
  type ScenarioKey,
} from "./projection-scenarios";

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-white/45">{label}</span>
      <span style={{ color: resultHex(value), fontWeight: 600 }}>{formatCurrency(value)}</span>
    </div>
  );
}

function scenarioBreakdown(data: RiskDashboardData, scenarioKey: ScenarioKey) {
  const average = findAverageScenario(data, scenarioKey)?.projection;
  if (average) {
    return {
      total: average.total,
      lines: (
        <>
          <Line label={`Realizado (${average.realizedDays} dia(s))`} value={average.realizedNet} />
          <Line
            label={`Pendentes (${data.pendingCount} × ${formatCurrency(average.average)}, média de ${average.sampleDays} dia(s))`}
            value={average.pendingNet}
          />
        </>
      ),
    };
  }

  const scenario = findStopScenario(data, scenarioKey);
  return {
    total: scenario.total,
    lines: (
      <>
        <Line label={`Realizado (${data.realizedDays} dia(s), ${scenario.realizedLossDays} de stop)`} value={scenario.realizedNet} />
        <Line
          label={`Pendentes (${scenario.pendingGainDays} de meta + ${scenario.pendingLossDays} de stop)`}
          value={scenario.pendingNet}
        />
      </>
    ),
  };
}

export function MonthProjectionCard({ data }: { data: RiskDashboardData }) {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>(DEFAULT_SCENARIO);
  const { total, lines } = scenarioBreakdown(data, scenarioKey);

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <CalendarOutlined /> Projeção de {data.monthLabel}
        </span>
      }
      extra={<Link href="/configuracoes" className="text-xs">Configurar</Link>}
      className="h-full"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-white/45">Cenário do mês</span>
        <Segmented
          size="small"
          value={scenarioKey}
          onChange={(value) => setScenarioKey(parseScenarioKey(value))}
          options={scenarioOptions(data, "stops")}
        />
      </div>
      <Statistic
        className="mt-4"
        title="Fechamento projetado do mês"
        value={formatCurrency(total)}
        styles={{ content: { color: resultHex(total), fontWeight: 600 } }}
      />
      <Divider className="my-3!" />
      {lines}
      <p className="mt-3 text-xs text-white/45">
        {data.businessDays} pregões no mês · {data.config.contracts} contrato(s) {data.config.asset} · ponto de equilíbrio: até{" "}
        {data.breakEven} stops no mês.
      </p>
    </Card>
  );
}
