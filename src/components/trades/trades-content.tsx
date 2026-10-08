import { PageHeader } from "@/components/layout/page-header";
import { AddTradesDialog } from "@/components/shared/add-trades-dialog";
import { FilterBar } from "@/components/shared/filter-bar";
import { loadRiskOverlay } from "@/lib/pending-days";
import { filtersToQueryString } from "@/lib/trade-filters";
import { DAYS_PER_PAGE, loadTradePageData, paginateDays, type TradeSearchParams } from "@/lib/trade-page-data";
import { DailyTradesTable } from "./daily-trades-table";
import { MonthlyDeviationsCard } from "./monthly-deviations-card";

export async function TradesContent({ searchParams }: { searchParams: TradeSearchParams }) {
  const { userId, filters, page, days, today, defaultAccount } = await loadTradePageData(searchParams);
  const daysPage = paginateDays(days, page);
  const { account } = filters;
  const overlay = account
    ? await loadRiskOverlay(userId, { ...filters, account }, days, daysPage.pageDays, today)
    : null;

  return (
    <>
      <PageHeader
        title="Trades"
        description="Histórico agrupado por dia. Clique em um dia para ver as operações."
        action={<AddTradesDialog today={today} defaultAccount={defaultAccount} />}
      />
      <FilterBar key={filtersToQueryString(filters)} initialFilters={filters} />
      {overlay && <MonthlyDeviationsCard months={overlay.monthlyDeviations} />}
      <DailyTradesTable
        filters={filters}
        days={daysPage.pageDays}
        pendingDays={overlay?.pendingDays ?? []}
        deviations={overlay?.deviations ?? {}}
        page={daysPage.page}
        pageSize={DAYS_PER_PAGE}
        totalDays={daysPage.totalDays}
      />
    </>
  );
}
