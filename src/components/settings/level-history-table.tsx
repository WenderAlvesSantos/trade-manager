"use client";

import { HistoryOutlined } from "@ant-design/icons";
import { Card, Table, Tag, type TableColumnsType } from "antd";
import type { LevelChangeReason } from "@/generated/prisma/enums";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LevelHistoryEntry } from "@/lib/level-history";
import { resultHex } from "@/lib/theme";

const REASON_TAG: Record<LevelChangeReason, { color: string; label: string }> = {
  SUBIDA: { color: "green", label: "Subida (banca)" },
  REBAIXAMENTO: { color: "orange", label: "Rebaixamento" },
  MANUAL: { color: "default", label: "Ajuste manual" },
};

const COLUMNS: TableColumnsType<LevelHistoryEntry> = [
  { title: "Data", dataIndex: "date", render: (date: Date) => formatDate(date) },
  {
    title: "Mudança",
    key: "change",
    render: (_, entry) => (
      <span className="font-medium">
        {entry.fromContracts} → {entry.toContracts} contr.
      </span>
    ),
  },
  {
    title: "Motivo",
    dataIndex: "reason",
    render: (reason: LevelChangeReason) => <Tag color={REASON_TAG[reason].color}>{REASON_TAG[reason].label}</Tag>,
  },
  {
    title: "Líquido do nível encerrado",
    dataIndex: "netSinceLevelStart",
    align: "right",
    render: (value: number) => <span style={{ color: resultHex(value), fontWeight: 600 }}>{formatCurrency(value)}</span>,
  },
];

export function LevelHistoryTable({ history }: { history: LevelHistoryEntry[] }) {
  return (
    <Card
      size="small"
      title={
        <span className="flex items-center gap-2">
          <HistoryOutlined /> Histórico de níveis
        </span>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table
        rowKey="id"
        size="small"
        columns={COLUMNS}
        dataSource={history}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: "Nenhuma mudança de contratos registrada ainda." }}
      />
    </Card>
  );
}
