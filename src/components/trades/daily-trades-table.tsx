"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, Table, type TableColumnsType } from "antd";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { resultHex } from "@/lib/theme";
import type { DaySummary } from "@/lib/trade-aggregations";
import { filtersToQueryString, type TradeFilters } from "@/lib/trade-filters";
import { DayTradesDetail } from "./day-trades-detail";

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

const COLUMNS: TableColumnsType<DaySummary> = [
  { title: "Data", dataIndex: "day", render: (day: string) => <span className="font-medium">{formatDate(day)}</span> },
  { title: "Trades", dataIndex: "tradeCount", align: "right" },
  { title: "Win Rate", dataIndex: "winRate", align: "right", render: formatPercent },
  { title: "Pontos", key: "points", align: "right", render: (_, day) => <DayPoints pointsByAsset={day.pointsByAsset} /> },
  { title: "Bruto", dataIndex: "grossResult", align: "right", render: (value: number) => colored(value, formatCurrency(value)) },
  { title: "Taxas", dataIndex: "fees", align: "right", render: formatCurrency },
  { title: "Lucro Op.", dataIndex: "operatingProfit", align: "right", render: (value: number) => colored(value, formatCurrency(value)) },
  { title: "IRRF", dataIndex: "irrf", align: "right", render: formatCurrency },
  { title: "Líquido", dataIndex: "netResult", align: "right", render: (value: number) => colored(value, formatCurrency(value), true) },
];

type DailyTradesTableProps = {
  filters: TradeFilters;
  days: DaySummary[];
  page: number;
  pageSize: number;
  totalDays: number;
};

// Paginação no servidor: a página fica na URL (?pagina=N); os trades de um dia só são buscados ao expandir.
export function DailyTradesTable({ filters, days, page, pageSize, totalDays }: DailyTradesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function goToPage(nextPage: number) {
    startTransition(() => router.push(`${pathname}${filtersToQueryString(filters, nextPage)}`, { scroll: false }));
  }

  return (
    <Card title="Histórico diário" extra={<span className="text-xs text-white/45">{totalDays} dia(s) operado(s)</span>} styles={{ body: { padding: 0 } }}>
      <Table
        rowKey="day"
        columns={COLUMNS}
        dataSource={days}
        loading={isPending}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize,
          total: totalDays,
          hideOnSinglePage: true,
          showSizeChanger: false,
          onChange: goToPage,
        }}
        expandable={{
          expandRowByClick: true,
          // A key muda quando os totais do dia mudam (inclusão/edição/exclusão), forçando nova busca.
          expandedRowRender: (day) => (
            <DayTradesDetail
              key={`${day.day}-${day.tradeCount}-${day.grossResult}`}
              day={day.day}
              account={filters.account}
            />
          ),
        }}
        locale={{ emptyText: "Nenhum trade encontrado para os filtros selecionados." }}
      />
    </Card>
  );
}
