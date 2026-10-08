"use client";

import { AuditOutlined } from "@ant-design/icons";
import { Card, Table, Tag, type TableColumnsType } from "antd";
import type { DatedRule } from "@/lib/day-deviation";
import { formatCurrency, formatDate } from "@/lib/format";
import { RULE_BASELINE_DATE } from "@/lib/rule-baseline";
import { formatMaxContracts } from "@/lib/rule-changes";

const COLUMNS: TableColumnsType<DatedRule> = [
  {
    title: "Vigente desde",
    dataIndex: "effectiveFrom",
    render: (day: string) => (day === RULE_BASELINE_DATE ? <Tag>Início</Tag> : formatDate(day)),
  },
  { title: "Meta global", dataIndex: "dailyGainTarget", align: "right", render: (value: number) => `+${value} pts` },
  { title: "Stop global", dataIndex: "dailyStopLimit", align: "right", render: (value: number) => `−${value} pts` },
  { title: "Tolerância", dataIndex: "deviationTolerance", align: "right", render: (value: number) => `${value} pts` },
  { title: "Risco/stop", dataIndex: "riskPercent", align: "right", render: (value: number) => `${value}%` },
  {
    title: "Margem",
    dataIndex: "marginPerContract",
    align: "right",
    render: (value: number) => (value > 0 ? formatCurrency(value) : "sem teto"),
  },
  {
    title: "Proteção",
    dataIndex: "drawdownLimit",
    align: "right",
    render: (value: number) => (value > 0 ? `${value}%` : "desligada"),
  },
  { title: "Máximo", dataIndex: "maxContracts", align: "right", render: formatMaxContracts },
];

// Versões das regras: desvios e simulação da banca usam a versão vigente em cada dia.
export function RuleHistoryTable({ history }: { history: DatedRule[] }) {
  return (
    <Card
      size="small"
      title={
        <span className="flex items-center gap-2">
          <AuditOutlined /> Histórico de regras (robô e gestão de banca)
        </span>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table
        rowKey="effectiveFrom"
        size="small"
        columns={COLUMNS}
        dataSource={history}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: "Nenhuma mudança de regra registrada: todos os dias usam a configuração atual." }}
      />
    </Card>
  );
}
