"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Card, Pagination, Table } from "antd";
import { daysWithinMonths, projectDays } from "@/lib/daily-projection";
import type { DaySummary } from "@/lib/trade-aggregations";
import { ACCOUNT_LABEL, filtersToQueryString, type TradeFilters } from "@/lib/trade-filters";
import type { DayBalance, DeviationsByDay, ProjectionInput } from "@/lib/trades-overlay";
import { buildDailyColumns, type DailyRow } from "./daily-trades-columns";
import { DayTradesDetail } from "./day-trades-detail";
import { ProjectionControls, ProjectionSummary, useProjectionSettings } from "./projection-controls";
import { ProjectionExportButton } from "./projection-export-button";

type DailyTradesTableProps = {
  filters: TradeFilters;
  days: DaySummary[];
  projection: ProjectionInput | null;
  balances: Record<string, DayBalance>;
  deviations: DeviationsByDay;
  page: number;
  pageSize: number;
  totalDays: number;
};

function useProjectedDays(projection: ProjectionInput | null) {
  const [settings, setSettings] = useProjectionSettings();
  const projected = useMemo(() => {
    if (!projection) return [];
    const days = daysWithinMonths(projection.days, projection.today, settings.months);
    return projectDays(projection.configs, { ...projection, days, stopEvery: settings.stopEvery });
  }, [projection, settings]);
  return { settings, setSettings, projected };
}

// Paginação no servidor: a página fica na URL (?pagina=N); os trades de um dia só são buscados ao expandir.
// Pregões projetados ficam no topo da primeira página (mais distante primeiro), fora da contagem da paginação.
export function DailyTradesTable({ filters, days, projection, balances, deviations, page, pageSize, totalDays }: DailyTradesTableProps) {
  const columns = useMemo(() => buildDailyColumns(deviations), [deviations]);
  const { settings, setSettings, projected } = useProjectedDays(projection);
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function goToPage(nextPage: number) {
    startTransition(() => router.push(`${pathname}${filtersToQueryString(filters, nextPage)}`, { scroll: false }));
  }

  const rows: DailyRow[] = [
    ...(page === 1 ? [...projected].reverse().map((day) => ({ ...day, kind: "projected" as const })) : []),
    ...days.map((day) => ({ ...day, kind: "realized" as const, balance: balances[day.day] })),
  ];

  return (
    <Card
      title="Histórico diário"
      extra={
        projection ? (
          <div className="flex flex-wrap items-center gap-2">
            <ProjectionControls settings={settings} onChange={setSettings} />
            <ProjectionExportButton
              input={projection}
              projected={projected}
              settings={settings}
              accountLabel={filters.account ? ACCOUNT_LABEL[filters.account] : ""}
              fileLabel={[filters.account, filters.asset].filter(Boolean).join("-").toLowerCase()}
            />
          </div>
        ) : (
          <span className="text-xs text-white/45">
            {totalDays} dia(s) operado(s)
            {!filters.account && " · selecione Simulador ou Real para ver a projeção"}
          </span>
        )
      }
      styles={{ body: { padding: 0 } }}
    >
      {projection && <ProjectionSummary input={projection} days={projected} />}
      <Table
        rowKey="day"
        columns={columns}
        dataSource={rows}
        loading={isPending}
        scroll={{ x: 1100 }}
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
