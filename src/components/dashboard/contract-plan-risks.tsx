"use client";

import { Table, Tag, type TableColumnsType } from "antd";
import { PLAN_HORIZON_MONTHS, type RiskTimeline, type YearMonth } from "@/lib/contract-plan";
import { formatCurrency, formatPercent } from "@/lib/format";
import { COLORS } from "@/lib/theme";

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" });
export const labelOfMonth = ({ year, month }: YearMonth) => monthLabel.format(new Date(Date.UTC(year, month - 1, 1)));

function deadline(row: RiskTimeline) {
  if (row.monthsAhead === 0) return <Tag color="green" className="m-0!">já liberado</Tag>;
  if (!row.reachedAt || row.monthsAhead === null) {
    return <span className="text-white/45">{row.contractsToday === 0 ? "não opera" : `+${PLAN_HORIZON_MONTHS / 12} anos`}</span>;
  }
  return (
    <span className="capitalize">
      {labelOfMonth(row.reachedAt)} <span className="text-white/45">({row.monthsAhead} m)</span>
    </span>
  );
}

const COLUMNS: TableColumnsType<RiskTimeline> = [
  {
    title: "Risco/stop",
    dataIndex: "riskPercent",
    render: (value: number, row) => (
      <span className="flex items-center gap-2">
        {value}%{row.current && <Tag className="m-0!">atual</Tag>}
      </span>
    ),
  },
  { title: "Contratos hoje", dataIndex: "contractsToday", align: "right" },
  { title: "Banca no máximo", dataIndex: "targetBankroll", align: "right", render: (value: number) => formatCurrency(value) },
  { title: "Chega ao máximo", key: "deadline", align: "right", render: (_, row) => deadline(row) },
  {
    title: "4 stops seguidos",
    dataIndex: "streakLoss",
    align: "right",
    render: (value: number) => <span style={{ color: value > 0.35 ? COLORS.loss : undefined }}>−{formatPercent(value)}</span>,
  },
];

// Prazo até o máximo de contratos em cada risco %, no mesmo cenário: mais risco chega antes, mas aguenta menos stops.
export function ContractPlanRisks({ rows }: { rows: RiskTimeline[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Prazo até o máximo por risco</span>
      <Table rowKey="riskPercent" size="small" columns={COLUMNS} dataSource={rows} pagination={false} />
    </div>
  );
}
