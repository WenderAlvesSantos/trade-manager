import { PageHeader } from "@/components/layout/page-header";
import { AddTradesDialog } from "@/components/shared/add-trades-dialog";
import { FilterBar } from "@/components/shared/filter-bar";
import { buildEquityCurve, summarizePeriod } from "@/lib/trade-aggregations";
import { filtersToQueryString } from "@/lib/trade-filters";
import { computeRiskMetrics } from "@/lib/trade-metrics";
import { loadTradePageData, type TradeSearchParams } from "@/lib/trade-page-data";
import { DailyResultChart } from "./daily-result-chart";
import { RiskManagementSection } from "./risk-management-section";
import { RiskMetricsCards } from "./risk-metrics-cards";
import { SummaryCards } from "./summary-cards";

export async function DashboardContent({ searchParams }: { searchParams: TradeSearchParams }) {
  const { userId, filters, days, today, defaultAccount } = await loadTradePageData(searchParams);
  const equityCurve = buildEquityCurve(days);
  const summary = summarizePeriod(days);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu desempenho no período selecionado."
        action={<AddTradesDialog today={today} defaultAccount={defaultAccount} />}
      />
      <FilterBar key={filtersToQueryString(filters)} initialFilters={filters} />
      <RiskManagementSection userId={userId} account={filters.account} asset={filters.asset} today={today} />
      <SummaryCards summary={summary} />
      <RiskMetricsCards metrics={computeRiskMetrics(equityCurve)} profitFactor={summary.profitFactor} />
      <DailyResultChart data={equityCurve} />
    </>
  );
}
