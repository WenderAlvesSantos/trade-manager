"use client";

import { Table, Tag, type TableColumnsType } from "antd";
import type { BankrollLevel } from "@/lib/bankroll-sizing";
import { formatCurrency } from "@/lib/format";
import { COLORS } from "@/lib/theme";

type LevelsTableProps = { levels: BankrollLevel[]; current: number; recommended: number };

function buildColumns(current: number, recommended: number): TableColumnsType<BankrollLevel> {
  return [
    {
      title: "Contratos",
      dataIndex: "contracts",
      render: (contracts: number) => (
        <span className="flex items-center gap-2 font-medium">
          {contracts}
          {contracts === current && <Tag className="m-0!">atual</Tag>}
          {contracts === recommended && contracts !== current && <Tag color="green" className="m-0!">recomendado</Tag>}
        </span>
      ),
    },
    { title: "Banca necessária", dataIndex: "requiredBankroll", align: "right", render: (value: number) => formatCurrency(value) },
    {
      title: "Dia de stop",
      dataIndex: "stopCost",
      align: "right",
      render: (value: number) => <span style={{ color: COLORS.loss }}>−{formatCurrency(value)}</span>,
    },
    {
      title: "Falta",
      dataIndex: "missing",
      align: "right",
      render: (value: number) =>
        value > 0 ? formatCurrency(value) : <span style={{ color: COLORS.profit }}>liberado</span>,
    },
  ];
}

// Patamares de banca: quanto de banca cada quantidade de contratos exige e quanto falta para chegar lá.
export function BankrollLevelsTable({ levels, current, recommended }: LevelsTableProps) {
  return (
    <Table
      rowKey="contracts"
      size="small"
      columns={buildColumns(current, recommended)}
      dataSource={levels}
      pagination={false}
    />
  );
}
