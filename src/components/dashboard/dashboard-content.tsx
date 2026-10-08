import { requireUserId } from "@/lib/session";
import { groupTradesByDay, summarizePeriod } from "@/lib/trade-aggregations";
import { filtersToQueryString, parseTradeFilters } from "@/lib/trade-filters";
import { getUserTrades } from "@/lib/trades";
import { AddTradesDialog } from "./add-trades-dialog";
import { DailyTradesTable } from "./daily-trades-table";
import { FilterBar } from "./filter-bar";
import { SummaryCards } from "./summary-cards";

const todayInSaoPaulo = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Lê sessão e searchParams (dados de request), por isso deve ficar dentro de um <Suspense>.
export async function DashboardContent({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const [userId, filters] = await Promise.all([
    requireUserId(),
    searchParams.then(parseTradeFilters),
  ]);
  const days = groupTradesByDay(await getUserTrades(userId, filters));

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <AddTradesDialog today={todayInSaoPaulo()} defaultAccount={filters.account ?? "SIMULADOR"} />
      </div>
      <FilterBar key={filtersToQueryString(filters)} initialFilters={filters} />
      <SummaryCards summary={summarizePeriod(days)} />
      <DailyTradesTable days={days} />
    </>
  );
}
