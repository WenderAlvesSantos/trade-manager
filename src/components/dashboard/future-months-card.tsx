"use client";

import { useMemo, useState } from "react";
import { FundProjectionScreenOutlined } from "@ant-design/icons";
import { Alert, Card, Segmented, Table, Tag, type TableColumnsType } from "antd";
import { formatCurrency } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { forecastMonths, type ForecastMonth } from "@/lib/risk-forecast";
import { MOVING_AVERAGE_DAYS } from "@/lib/risk-projection";
import { COLORS, resultHex } from "@/lib/theme";
import { MoneyLineChart, type MoneyPoint } from "./money-line-chart";
import {
  DEFAULT_SCENARIO,
  forecastScenarioFor,
  parseScenarioKey,
  pendingNetFor,
  scenarioOptions,
  type ScenarioKey,
} from "./projection-scenarios";

const FORECAST_MONTHS = 6;

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
const labelOf = ({ year, month }: Pick<ForecastMonth, "year" | "month">) => monthLabel.format(new Date(Date.UTC(year, month - 1, 1)));

const money = (value: number, bold = false) => (
  <span style={{ color: resultHex(value), fontWeight: bold ? 600 : undefined }}>{formatCurrency(value)}</span>
);

function ContractsChange({ row }: { row: ForecastMonth }) {
  if (row.nextContracts === null) return <span className="text-white/30">—</span>;
  const up = row.nextContracts > row.contracts;
  return <Tag color={up ? "green" : "orange"}>{up ? "Sobe" : "Reduz"} p/ {row.nextContracts}</Tag>;
}

const COLUMNS: TableColumnsType<ForecastMonth> = [
  { title: "Mês", key: "month", render: (_, row) => <span className="font-medium capitalize">{labelOf(row)}</span> },
  { title: "Pregões", dataIndex: "businessDays", align: "right" },
  { title: "Contratos", dataIndex: "contracts", align: "right" },
  { title: "Líquido", dataIndex: "net", align: "right", render: (value: number) => money(value) },
  { title: "Banca", dataIndex: "bankroll", align: "right", render: (value: number) => money(value, true) },
  { title: "Próximo mês", key: "change", align: "right", render: (_, row) => <ContractsChange row={row} /> },
];

const CHART_COLORS = [COLORS.profit, "rgba(255, 255, 255, 0.45)"];

function toChartData(months: ForecastMonth[]): MoneyPoint[] {
  return months.flatMap((month) => [
    { label: labelOf(month), value: month.bankroll, series: "Contratos pela banca" },
    { label: labelOf(month), value: month.fixedBankroll, series: "Contratos fixos" },
  ]);
}

// Meses cheios a partir do próximo; a banca inicial é a atual mais o que falta do mês corrente no cenário escolhido.
export function FutureMonthsCard({ data }: { data: RiskDashboardData }) {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>(DEFAULT_SCENARIO);

  const months = useMemo(
    () =>
      forecastMonths(data.config, {
        startYear: data.nextMonth.year,
        startMonth: data.nextMonth.month,
        months: FORECAST_MONTHS,
        scenario: forecastScenarioFor(data, scenarioKey),
        initialBankroll: data.bankroll.bankroll + pendingNetFor(data, scenarioKey),
        drawdown: data.bankrollDrawdown,
      }),
    [data, scenarioKey],
  );

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <FundProjectionScreenOutlined /> Banca nos próximos {FORECAST_MONTHS} meses · {data.config.asset}
        </span>
      }
      extra={
        <Segmented
          size="small"
          value={scenarioKey}
          onChange={(value) => setScenarioKey(parseScenarioKey(value))}
          options={scenarioOptions(data, "stops/mês")}
        />
      }
    >
      {data.bankroll.configured ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Table rowKey={(row) => `${row.year}-${row.month}`} size="small" columns={COLUMNS} dataSource={months} pagination={false} />
          <MoneyLineChart data={toChartData(months)} colors={CHART_COLORS} />
        </div>
      ) : (
        <Alert type="info" showIcon title="Informe a banca inicial em Configurações para projetar a evolução da banca." />
      )}
      <p className="mt-3 text-xs text-white/45">
        A cada mês os contratos são redimensionados pela banca (risco de {data.config.riskPercent}% por dia de stop
        global, teto pela margem
        {data.config.drawdownLimit > 0 ? `, proteção ao cair ${data.config.drawdownLimit}% do pico` : ""}
        {data.config.maxContracts > 0 ? `, máximo de ${data.config.maxContracts} contratos` : ", sem máximo de contratos"}). As médias repetem o líquido por contrato dos dias operados no mês ou dos últimos{" "}
        {MOVING_AVERAGE_DAYS} pregões operados. Não considera custos fora da B3.
      </p>
    </Card>
  );
}
