import { requireUserId } from "@/lib/session";
import { getUserTradeSummary, getUserTrades } from "@/lib/trades";
import { SummaryCards } from "./summary-cards";
import { TradeForm } from "./trade-form";
import { TradesTable } from "./trades-table";

const todayInSaoPaulo = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

// Lê a sessão (dado de request), por isso deve ficar dentro de um <Suspense>.
export async function DashboardContent() {
  const userId = await requireUserId();
  const [trades, summary] = await Promise.all([
    getUserTrades(userId),
    getUserTradeSummary(userId),
  ]);

  return (
    <>
      <SummaryCards summary={summary} />
      <TradeForm today={todayInSaoPaulo()} />
      <TradesTable trades={trades} />
    </>
  );
}
