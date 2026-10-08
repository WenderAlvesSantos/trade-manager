"use client";

import { WarningOutlined } from "@ant-design/icons";
import { Card, Table, type TableColumnsType } from "antd";
import { DeviationTags } from "@/components/shared/deviation-tags";
import type { MonthDeviationSummary } from "@/lib/day-deviation";
import { COLORS } from "@/lib/theme";

const MONTHS_PER_PAGE = 6;
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

const COLUMNS: TableColumnsType<MonthDeviationSummary> = [
  {
    title: "Mês",
    dataIndex: "month",
    render: (month: string) => <span className="font-medium capitalize">{monthFormatter.format(new Date(`${month}-01`))}</span>,
  },
  { title: "Dias operados", dataIndex: "operatedDays", align: "right" },
  {
    title: "Fora do esperado",
    key: "total",
    align: "right",
    render: (_, { counts, operatedDays }) => (
      <span style={{ color: counts["stop-excedido"] > 0 ? COLORS.loss : counts.total > 0 ? COLORS.warning : undefined, fontWeight: 600 }}>
        {counts.total} de {operatedDays}
      </span>
    ),
  },
  {
    title: "Tipos",
    key: "kinds",
    render: (_, { counts }) =>
      counts.total > 0 ? (
        <span className="flex flex-wrap gap-1">
          <DeviationTags counts={counts} />
        </span>
      ) : (
        <span className="text-white/30">—</span>
      ),
  },
];

// Contador de desvios por mês no período filtrado; cada dia é avaliado com a meta/stop/tolerância vigentes na data.
export function MonthlyDeviationsCard({ months }: { months: MonthDeviationSummary[] }) {
  if (months.length === 0) return null;
  return (
    <Card
      size="small"
      title={
        <span className="flex items-center gap-2">
          <WarningOutlined /> Desvios por mês
        </span>
      }
      extra={<span className="text-xs text-white/45">regras vigentes em cada data</span>}
    >
      <Table
        rowKey="month"
        size="small"
        columns={COLUMNS}
        dataSource={months}
        pagination={{ pageSize: MONTHS_PER_PAGE, hideOnSinglePage: true, size: "small" }}
      />
    </Card>
  );
}
