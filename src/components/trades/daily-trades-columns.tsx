"use client";

import { Tag, type TableColumnsType } from "antd";
import type { Asset } from "@/generated/prisma/enums";
import type { ProjectedDay } from "@/lib/daily-projection";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { DaySummary } from "@/lib/trade-aggregations";
import type { DayBalance, DeviationsByDay } from "@/lib/trades-overlay";
import { colored, DeviationIcon, PerAsset, PlanCell, ProjectedPoints, RealizedPoints } from "./daily-row-cells";

export type DailyRow = (DaySummary & { kind: "realized"; balance?: DayBalance }) | (ProjectedDay & { kind: "projected" });

const hiddenWhenProjected = (row: DailyRow) => (row.kind === "projected" ? { colSpan: 0 } : {});

const dayContracts = (row: DailyRow) =>
  row.kind === "projected"
    ? Math.max(0, ...row.assets.map((item) => item.contracts))
    : Math.max(0, ...Object.values(row.contractsByAsset).map((value) => value ?? 0));

function ContractsCell({ row }: { row: DailyRow }) {
  const items =
    row.kind === "projected"
      ? row.assets.map((item) => ({ asset: item.asset, content: item.contracts }))
      : Object.entries(row.contractsByAsset).map(([asset, value]) => ({ asset: asset as Asset, content: value }));
  return <PerAsset items={items} />;
}

// Colunas monetárias: realizados e projetados têm os mesmos campos.
function moneyColumn(title: string, key: "grossResult" | "fees" | "operatingProfit" | "irrf", tone = true): TableColumnsType<DailyRow>[number] {
  return {
    title,
    key,
    align: "right",
    render: (_, row) => (tone ? colored(row[key], formatCurrency(row[key])) : formatCurrency(row[key])),
  };
}

export const buildDailyColumns = (deviations: DeviationsByDay): TableColumnsType<DailyRow> => [
  {
    title: "Data",
    dataIndex: "day",
    fixed: "left",
    render: (day: string, row) => (
      <span className="font-medium whitespace-nowrap" style={{ opacity: row.kind === "projected" ? 0.7 : 1 }}>
        {formatDate(day)}
        {row.kind === "realized" && <DeviationIcon deviations={deviations[day]} />}
      </span>
    ),
  },
  { title: "Contratos", key: "contracts", align: "right", render: (_, row) => <ContractsCell row={row} /> },
  {
    title: "Trades",
    key: "tradeCount",
    align: "right",
    onCell: (row) => (row.kind === "projected" ? { colSpan: 2 } : {}),
    render: (_, row) =>
      row.kind === "realized" ? (
        row.tradeCount
      ) : (
        <Tag color={row.isToday ? "processing" : "default"} className="m-0!">
          {row.isToday ? "Hoje · projeção" : "Projeção"}
        </Tag>
      ),
  },
  {
    title: "Win Rate",
    key: "winRate",
    align: "right",
    onCell: hiddenWhenProjected,
    render: (_, row) => (row.kind === "realized" ? formatPercent(row.winRate) : null),
  },
  {
    title: "Pontos",
    key: "points",
    align: "right",
    render: (_, row) =>
      row.kind === "realized" ? <RealizedPoints pointsByAsset={row.pointsByAsset} /> : <ProjectedPoints assets={row.assets} />,
  },
  moneyColumn("Bruto", "grossResult"),
  moneyColumn("Taxas", "fees", false),
  moneyColumn("Lucro Op.", "operatingProfit"),
  moneyColumn("IRRF", "irrf", false),
  {
    title: "Líquido",
    key: "netResult",
    align: "right",
    render: (_, row) => colored(row.netResult, formatCurrency(row.netResult), true),
  },
  {
    title: "Saldo",
    key: "bankroll",
    align: "right",
    render: (_, row) => {
      const bankroll = row.kind === "projected" ? row.bankroll : row.balance?.bankroll;
      return bankroll === undefined ? <span className="text-white/30">—</span> : formatCurrency(bankroll);
    },
  },
  {
    title: "Plano",
    key: "plan",
    align: "right",
    render: (_, row) => {
      const plan = row.kind === "projected" ? row.nextContracts : row.balance?.plan;
      return plan === undefined ? <span className="text-white/30">—</span> : <PlanCell plan={plan} current={dayContracts(row)} />;
    },
  },
];
