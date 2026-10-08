"use client";

import { Alert, Table, Tag, type TableColumnsType } from "antd";
import type { AccountType } from "@/generated/prisma/enums";
import { formatCurrency } from "@/lib/format";
import { COLORS, resultHex } from "@/lib/theme";
import { roundToCents } from "@/lib/trade-calculations";
import { ACCOUNT_LABEL } from "@/lib/trade-filters";
import type { DayTrade } from "@/lib/trades";
import { DeleteTradeButton } from "./delete-trade-button";
import { useDayTrades } from "./use-day-trades";

const colored = (value: number, text: string, bold = false) => (
  <span style={{ color: resultHex(value), fontWeight: bold ? 600 : undefined }}>{text}</span>
);

const COLUMNS: TableColumnsType<DayTrade> = [
  { title: "#", key: "order", width: 48, render: (_, __, index) => <span className="text-white/45">{index + 1}</span> },
  { title: "Ativo", dataIndex: "asset", width: 90, render: (asset: string) => <Tag color={asset === "WIN" ? "blue" : "gold"}>{asset}</Tag> },
  {
    title: "Conta",
    dataIndex: "accountType",
    width: 120,
    render: (account: AccountType) => <Tag color={account === "REAL" ? "green" : "default"}>{ACCOUNT_LABEL[account]}</Tag>,
  },
  { title: "Contratos", dataIndex: "contracts", align: "right", width: 110 },
  { title: "Pontos", dataIndex: "points", align: "right", width: 110, render: (points: number) => colored(points, points.toLocaleString("pt-BR")) },
  { title: "Bruto", dataIndex: "grossResult", align: "right", render: (value: number) => colored(value, formatCurrency(value)) },
  { title: "Taxas", dataIndex: "fees", align: "right", render: formatCurrency },
  {
    title: "Resultado",
    key: "result",
    align: "right",
    render: (_, trade) => {
      const result = roundToCents(trade.grossResult - trade.fees);
      return colored(result, formatCurrency(result), true);
    },
  },
  { key: "actions", align: "center", width: 56, render: (_, trade) => <DeleteTradeButton tradeId={trade.id} /> },
];

export function DayTradesDetail({ day, account }: { day: string; account?: AccountType }) {
  const state = useDayTrades(day, account);

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ background: COLORS.bgContainer, borderColor: COLORS.border }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 text-xs text-white/45">
        <span className="font-medium uppercase tracking-wider">Operações do dia</span>
        {state.status === "ready" && <span>Ordem de lançamento</span>}
      </div>
      {state.status === "error" ? (
        <Alert type="error" title={state.message} showIcon className="m-3" />
      ) : (
        <Table
          rowKey="id"
          size="small"
          tableLayout="fixed"
          columns={COLUMNS}
          dataSource={state.status === "ready" ? state.trades : []}
          loading={state.status === "loading"}
          pagination={false}
          scroll={{ x: 800 }}
        />
      )}
    </div>
  );
}
