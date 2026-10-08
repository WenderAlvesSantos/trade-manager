"use client";

import { WarningOutlined } from "@ant-design/icons";
import { Tag, Tooltip, type TableColumnsType } from "antd";
import type { DayDeviation } from "@/lib/day-deviation";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { DeviationsByDay, PendingDay, PendingRange } from "@/lib/pending-days";
import { COLORS, resultHex } from "@/lib/theme";
import type { DaySummary } from "@/lib/trade-aggregations";

export type DailyRow = (DaySummary & { kind: "realized" }) | (PendingDay & { kind: "pending" });

const colored = (value: number, text: string, bold = false) => (
  <span style={{ color: resultHex(value), fontWeight: bold ? 600 : undefined }}>{text}</span>
);

// Pontos de WIN e WDO têm valores diferentes, por isso são exibidos separados quando o dia tem os dois.
function DayPoints({ pointsByAsset }: Pick<DaySummary, "pointsByAsset">) {
  const entries = Object.entries(pointsByAsset);
  return (
    <span className="flex flex-col items-end">
      {entries.map(([asset, { gained, lost }]) => {
        const net = gained - lost;
        return (
          <span key={asset}>
            {colored(net, net.toLocaleString("pt-BR"))}
            {entries.length > 1 && <span className="ml-1 text-xs text-white/45">{asset}</span>}
          </span>
        );
      })}
    </span>
  );
}

// Faixa "meta / stop" de um dia pendente.
function Range({ gain, loss }: { gain: string; loss: string }) {
  return (
    <span className="whitespace-nowrap">
      <span style={{ color: COLORS.profit }}>{gain}</span>
      <span className="text-white/30"> / </span>
      <span style={{ color: COLORS.loss }}>{loss}</span>
    </span>
  );
}

// Uma faixa por ativo operado; o nome do ativo só aparece quando há mais de um.
function PendingRanges({ ranges, render }: { ranges: PendingRange[]; render: (range: PendingRange) => React.ReactNode }) {
  return (
    <span className="flex flex-col items-end">
      {ranges.map((range) => (
        <span key={range.asset}>
          {render(range)}
          {ranges.length > 1 && <span className="ml-1 text-xs text-white/45">{range.asset}</span>}
        </span>
      ))}
    </span>
  );
}

const hiddenWhenPending = (row: DailyRow) => (row.kind === "pending" ? { colSpan: 0 } : {});

// Colunas monetárias de dias realizados; em dias pendentes são escondidas e a primeira delas ocupa o espaço.
function moneyColumn(title: string, key: "grossResult" | "fees" | "operatingProfit" | "irrf", tone = true): TableColumnsType<DailyRow>[number] {
  return {
    title,
    key,
    align: "right",
    onCell: hiddenWhenPending,
    render: (_, row) => (row.kind === "realized" ? (tone ? colored(row[key], formatCurrency(row[key])) : formatCurrency(row[key])) : null),
  };
}

// Ícone de alerta quando o dia fugiu da meta/stop do robô além da tolerância (em qualquer ativo operado).
function DeviationIcon({ deviations }: { deviations?: DayDeviation[] }) {
  if (!deviations?.length) return null;
  const color = deviations.some((item) => item.kind === "stop-excedido") ? COLORS.loss : COLORS.warning;
  const label = deviations.map((item) => item.message).join(" ");
  return (
    <Tooltip
      title={
        <ul className="flex flex-col gap-1">
          {deviations.map((item) => (
            <li key={item.asset}>{item.message}</li>
          ))}
        </ul>
      }
    >
      <WarningOutlined className="ml-2" style={{ color }} aria-label={label} />
    </Tooltip>
  );
}

export const buildDailyColumns = (deviations: DeviationsByDay): TableColumnsType<DailyRow> => [
  {
    title: "Data",
    dataIndex: "day",
    render: (day: string, row) => (
      <span className="font-medium" style={{ opacity: row.kind === "pending" ? 0.7 : 1 }}>
        {formatDate(day)}
        {row.kind === "realized" && <DeviationIcon deviations={deviations[day]} />}
      </span>
    ),
  },
  {
    title: "Trades",
    key: "tradeCount",
    align: "right",
    onCell: (row) => (row.kind === "pending" ? { colSpan: 2 } : {}),
    render: (_, row) =>
      row.kind === "realized" ? row.tradeCount : <Tag color={row.isToday ? "processing" : "default"}>{row.isToday ? "Hoje · pendente" : "Pendente"}</Tag>,
  },
  {
    title: "Win Rate",
    key: "winRate",
    align: "right",
    onCell: hiddenWhenPending,
    render: (_, row) => (row.kind === "realized" ? formatPercent(row.winRate) : null),
  },
  {
    title: "Pontos",
    key: "points",
    align: "right",
    render: (_, row) =>
      row.kind === "realized" ? (
        <DayPoints pointsByAsset={row.pointsByAsset} />
      ) : (
        <PendingRanges
          ranges={row.ranges}
          render={(range) => (
            <Range gain={`+${range.gainPoints.toLocaleString("pt-BR")}`} loss={`−${range.lossPoints.toLocaleString("pt-BR")}`} />
          )}
        />
      ),
  },
  {
    ...moneyColumn("Bruto", "grossResult"),
    onCell: (row) => (row.kind === "pending" ? { colSpan: 4 } : {}),
    render: (_, row) =>
      row.kind === "realized" ? (
        colored(row.grossResult, formatCurrency(row.grossResult))
      ) : (
        <span className="flex flex-col text-xs text-white/45">
          {row.ranges.map((range) => (
            <span key={range.asset}>
              Robô {range.asset}: meta +{range.robotGain} / stop −{range.robotStop} pts · aguardando resultado
            </span>
          ))}
        </span>
      ),
  },
  moneyColumn("Taxas", "fees", false),
  moneyColumn("Lucro Op.", "operatingProfit"),
  moneyColumn("IRRF", "irrf", false),
  {
    title: "Líquido",
    key: "netResult",
    align: "right",
    render: (_, row) =>
      row.kind === "realized" ? (
        colored(row.netResult, formatCurrency(row.netResult), true)
      ) : (
        <PendingRanges
          ranges={row.ranges}
          render={(range) => <Range gain={formatCurrency(range.gainNet)} loss={formatCurrency(range.lossNet)} />}
        />
      ),
  },
];
