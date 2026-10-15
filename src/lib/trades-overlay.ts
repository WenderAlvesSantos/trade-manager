import type { AccountType } from "@/generated/prisma/enums";
import { businessDaysOfMonth, pendingBusinessDays } from "@/lib/b3-calendar";
import { initialDrawdown } from "@/lib/bankroll-drawdown";
import { loadBankrollCurve } from "@/lib/bankroll";
import { combinedContracts } from "@/lib/combined-sizing";
import { classifyDay, deviationsByMonth, type DayDeviation } from "@/lib/day-deviation";
import { HORIZON_CHOICES } from "@/lib/daily-projection";
import type { SheetDay } from "@/lib/projection-export";
import type { RiskConfig } from "@/lib/risk-projection";
import { getRuleResolver } from "@/lib/risk-rules";
import { activeConfigs, getAccountRiskConfigs } from "@/lib/risk-settings";
import type { DaySummary, EquityPoint } from "@/lib/trade-aggregations";
import type { TradeFilters } from "@/lib/trade-filters";

export type DeviationsByDay = Record<string, DayDeviation[]>;

// Banca combinada no fim de um dia realizado e contratos que ela comporta no pregão seguinte.
export type DayBalance = { bankroll: number; plan: number };

// Entrada da projeção (calculada no navegador conforme horizonte e padrão de stops escolhidos)
// e dias realizados do filtro no formato da planilha, para a exportação.
export type ProjectionInput = { configs: RiskConfig[]; bankroll: number; days: string[]; today: string; history: SheetDay[] };

const MAX_HORIZON = Math.max(...HORIZON_CHOICES);

// Pregões de hoje (se ainda sem trades) até o fim do último mês do horizonte, dentro do período filtrado.
function futureBusinessDays(today: string, realized: Set<string>, range: Pick<TradeFilters, "from" | "to">) {
  const [year, month] = today.split("-").map(Number);
  const later = Array.from({ length: MAX_HORIZON - 1 }, (_, index) => {
    const offset = month + index;
    return businessDaysOfMonth(year + Math.floor(offset / 12), (offset % 12) + 1);
  }).flat();
  return [...pendingBusinessDays(today, realized), ...later].filter(
    (day) => (!range.from || day >= range.from) && (!range.to || day <= range.to),
  );
}

const cumulativeUntil = (curve: EquityPoint[], day: string) =>
  curve.reduce((total, point) => (point.day <= day ? point.cumulative : total), 0);

// Soma das bancas dos ativos (inicial + líquido desde o início de cada um); null antes de qualquer início.
function combinedBankrollOn(configs: RiskConfig[], curves: EquityPoint[][], day: string) {
  if (!configs.some((config) => day >= config.bankrollStartDate)) return null;
  return configs.reduce(
    (total, config, index) =>
      total + config.initialBankroll + (day >= config.bankrollStartDate ? cumulativeUntil(curves[index], day) : 0),
    0,
  );
}

function sheetDay(configs: RiskConfig[], day: DaySummary, balance: DayBalance | undefined): SheetDay {
  const assets = configs.flatMap((config) => {
    const points = day.pointsByAsset[config.asset];
    if (!points) return [];
    return [
      {
        asset: config.asset,
        contracts: day.contractsByAsset[config.asset] ?? 0,
        points: points.gained - points.lost,
        result: day.resultByAsset[config.asset] ?? 0,
      },
    ];
  });
  return { day: day.day, assets, total: day.netResult, bankroll: balance?.bankroll ?? null, plan: balance?.plan ?? null, operated: true };
}

// Saldo combinado e plano de cada dia realizado; o histórico no formato da planilha alimenta a exportação.
async function loadBalances(userId: string, account: AccountType, configs: RiskConfig[], days: DaySummary[], today: string) {
  const curves = await Promise.all(
    configs.map((config) => loadBankrollCurve(userId, account, config.asset, config.bankrollStartDate)),
  );
  const balances: Record<string, DayBalance> = {};
  for (const { day } of days) {
    const bankroll = combinedBankrollOn(configs, curves, day);
    if (bankroll !== null) balances[day] = { bankroll, plan: combinedContracts(configs, bankroll, initialDrawdown(bankroll), null) };
  }
  const history = days.map((day) => sheetDay(configs, day, balances[day.day]));
  return { balances, history, bankrollToday: combinedBankrollOn(configs, curves, today) ?? 0 };
}

// Desvios, saldo combinado dos dias visíveis e entrada da projeção. Só existe com uma conta selecionada.
// A banca é da conta (todos os ativos operados); o filtro de ativo vale só para os desvios.
export async function loadRiskOverlay(
  userId: string,
  filters: TradeFilters & { account: AccountType },
  days: DaySummary[],
  visibleDays: DaySummary[],
  today: string,
) {
  const configs = activeConfigs(await getAccountRiskConfigs(userId, filters.account, today));
  const filtered = configs.filter((config) => !filters.asset || config.asset === filters.asset);
  const [resolvers, { balances, history, bankrollToday }] = await Promise.all([
    Promise.all(filtered.map((config) => getRuleResolver(userId, filters.account, config))),
    loadBalances(userId, filters.account, configs, days, today),
  ]);
  const visibleBalances = Object.fromEntries(
    visibleDays.flatMap(({ day }) => (balances[day] ? [[day, balances[day]] as const] : [])),
  );

  const deviations: DeviationsByDay = {};
  for (const day of visibleDays) {
    const found = classifyDay(resolvers, day.day, day.pointsByAsset);
    if (found.length > 0) deviations[day.day] = found;
  }

  const realized = new Set(days.map((day) => day.day));
  const projection: ProjectionInput | null =
    configs.length > 0 && configs.some((config) => config.initialBankroll > 0)
      ? { configs, bankroll: bankrollToday, days: futureBusinessDays(today, realized, filters), today, history }
      : null;

  return { projection, balances: visibleBalances, deviations, monthlyDeviations: deviationsByMonth(resolvers, days) };
}
