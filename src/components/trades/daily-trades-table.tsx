"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, Pagination, Table } from "antd";
import type { DeviationsByDay, PendingDay } from "@/lib/pending-days";
import type { DaySummary } from "@/lib/trade-aggregations";
import { filtersToQueryString, type TradeFilters } from "@/lib/trade-filters";
import { buildDailyColumns, type DailyRow } from "./daily-trades-columns";
import { DayTradesDetail } from "./day-trades-detail";

type DailyTradesTableProps = {
  filters: TradeFilters;
  days: DaySummary[];
  pendingDays: PendingDay[];
  deviations: DeviationsByDay;
  page: number;
  pageSize: number;
  totalDays: number;
};

function CardExtra({ filters, totalDays, pendingCount }: { filters: TradeFilters; totalDays: number; pendingCount: number }) {
  return (
    <span className="text-xs text-white/45">
      {totalDays} dia(s) operado(s)
      {filters.account
        ? pendingCount > 0 && ` · ${pendingCount} pendente(s) no mês`
        : " · selecione Simulador ou Real para ver os dias pendentes"}
    </span>
  );
}

// Paginação no servidor: a página fica na URL (?pagina=N); os trades de um dia só são buscados ao expandir.
// Dias pendentes do mês ficam no topo da primeira página, fora da contagem da paginação.
export function DailyTradesTable({ filters, days, pendingDays, deviations, page, pageSize, totalDays }: DailyTradesTableProps) {
  const columns = useMemo(() => buildDailyColumns(deviations), [deviations]);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function goToPage(nextPage: number) {
    startTransition(() => router.push(`${pathname}${filtersToQueryString(filters, nextPage)}`, { scroll: false }));
  }

  const rows: DailyRow[] = [
    ...(page === 1 ? pendingDays.map((day) => ({ ...day, kind: "pending" as const })) : []),
    ...days.map((day) => ({ ...day, kind: "realized" as const })),
  ];

  return (
    <Card
      title="Histórico diário"
      extra={<CardExtra filters={filters} totalDays={totalDays} pendingCount={pendingDays.length} />}
      styles={{ body: { padding: 0 } }}
    >
      <Table
        rowKey="day"
        columns={columns}
        dataSource={rows}
        loading={isPending}
        scroll={{ x: 900 }}
        pagination={false}
        expandable={{
          expandRowByClick: true,
          rowExpandable: (row) => row.kind === "realized",
          // A key muda quando os totais do dia mudam (inclusão/edição/exclusão), forçando nova busca.
          expandedRowRender: (row) =>
            row.kind === "realized" && (
              <DayTradesDetail
                key={`${row.day}-${filters.asset ?? "todos"}-${row.tradeCount}-${row.grossResult}`}
                day={row.day}
                account={filters.account}
                asset={filters.asset}
              />
            ),
        }}
        locale={{ emptyText: "Nenhum trade encontrado para os filtros selecionados." }}
      />
      <Pagination
        className="flex justify-end p-4"
        current={page}
        pageSize={pageSize}
        total={totalDays}
        hideOnSinglePage
        showSizeChanger={false}
        onChange={goToPage}
      />
    </Card>
  );
}
