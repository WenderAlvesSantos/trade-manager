import { todayInSaoPaulo } from "@/lib/b3-calendar";
import { requireUserId } from "@/lib/session";
import { buildDaySummaries, type DaySummary } from "@/lib/trade-aggregations";
import { parsePage, parseTradeFilters } from "@/lib/trade-filters";
import { getDailyAssetTotals } from "@/lib/trades";

export type TradeSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const DAYS_PER_PAGE = 20;

// Dados comuns às telas de Dashboard e Trades. Lê sessão e searchParams: usar dentro de <Suspense>.
export async function loadTradePageData(searchParams: TradeSearchParams) {
  const [userId, params] = await Promise.all([requireUserId(), searchParams]);
  const filters = parseTradeFilters(params);
  const days = buildDaySummaries(await getDailyAssetTotals(userId, filters));

  return {
    userId,
    filters,
    page: parsePage(params),
    days,
    today: todayInSaoPaulo(),
    defaultAccount: filters.account ?? ("SIMULADOR" as const),
  };
}

// Listagem de Trades: do pregão mais antigo para o mais recente (o banco devolve do mais recente).
export const chronological = (days: DaySummary[]) => [...days].sort((a, b) => a.day.localeCompare(b.day));

// Os trades de cada dia não vêm aqui: são buscados em /api/trades quando a linha é expandida.
export function paginateDays(days: DaySummary[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const pageDays = days.slice((page - 1) * DAYS_PER_PAGE, page * DAYS_PER_PAGE);
  return { page, pageDays, totalDays: days.length };
}
