"use client";

import { Button, Popconfirm, Table, Tag, type TableColumnsType } from "antd";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { RiskComparison, RiskComparisonRow } from "@/lib/risk-comparison";
import { COLORS, resultHex } from "@/lib/theme";

export const protectionLabel = (limit: number) => (limit > 0 ? `${limit}%` : "desligada");

type AdoptProps = { onAdopt: (row: RiskComparisonRow) => void; adoptingKey: string | null };

function AdoptButton({ row, best, onAdopt, adoptingKey }: { row: RiskComparisonRow; best: boolean } & AdoptProps) {
  return (
    <Popconfirm
      title="Adotar como regra a partir de hoje?"
      description={`Risco de ${row.riskPercent}% por dia de stop e proteção ${protectionLabel(row.drawdownLimit)}. Os dias anteriores continuam com a regra da época.`}
      okText="Adotar"
      cancelText="Cancelar"
      onConfirm={() => onAdopt(row)}
    >
      <Button
        size="small"
        type={best ? "primary" : "default"}
        loading={adoptingKey === row.key}
        disabled={adoptingKey !== null && adoptingKey !== row.key}
      >
        Adotar
      </Button>
    </Popconfirm>
  );
}

function optionLabel(row: RiskComparisonRow, bestKey: string | null, adopt: AdoptProps) {
  if (row.era) return <Tag color="blue" className="m-0!">Regras de cada época</Tag>;
  const best = row.key === bestKey;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {row.riskPercent}% · proteção {protectionLabel(row.drawdownLimit)}
      {row.current && <Tag className="m-0!">atual</Tag>}
      {best && <Tag color="green" className="m-0!">equilíbrio</Tag>}
      {!row.current && <AdoptButton row={row} best={best} {...adopt} />}
    </span>
  );
}

function columns(bestKey: string | null, adopt: AdoptProps): TableColumnsType<RiskComparisonRow> {
  return [
    { title: "Risco/stop · proteção", key: "option", render: (_, row) => optionLabel(row, bestKey, adopt) },
    { title: "Banca final", dataIndex: "bankroll", align: "right", render: (value: number) => formatCurrency(value) },
    {
      title: "Retorno",
      dataIndex: "returnRate",
      align: "right",
      render: (value: number) => <span style={{ color: resultHex(value) }}>{formatPercent(value)}</span>,
    },
    {
      title: "Queda máx.",
      dataIndex: "maxDrawdown",
      align: "right",
      render: (value: number) => <span style={{ color: value > 0 ? COLORS.loss : undefined }}>{formatPercent(value)}</span>,
    },
    {
      title: "Retorno/queda",
      dataIndex: "returnPerDrawdown",
      align: "right",
      render: (value: number | null) => (value === null ? "sem queda" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })),
    },
    { title: "Proteções", dataIndex: "protections", align: "right" },
  ];
}

// Mesmo período e mesmos trades, seguindo as recomendações com cada combinação escolhida.
export function RiskComparisonTable({ comparison, ...adopt }: { comparison: RiskComparison } & AdoptProps) {
  return (
    <Table
      rowKey="key"
      size="small"
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
      scroll={{ x: true }}
      columns={columns(comparison.bestKey, adopt)}
      dataSource={comparison.rows}
    />
  );
}
