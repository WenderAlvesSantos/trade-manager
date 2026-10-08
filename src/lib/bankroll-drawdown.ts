import type { EquityPoint } from "@/lib/trade-aggregations";
import { roundToCents } from "@/lib/trade-calculations";

// Pico = maior banca já atingida. `protecting` liga ao cair o limite desde o pico e só desliga quando a banca volta a ele.
export type DrawdownState = { peak: number; protecting: boolean };

export type BankrollPoint = { day: string; bankroll: number; peak: number };

// Dia em que a proteção ligou (`on`) ou desligou, com a banca e o pico do fechamento.
export type ProtectionEvent = { day: string; on: boolean; bankroll: number; peak: number };

export const initialDrawdown = (bankroll: number): DrawdownState => ({ peak: bankroll, protecting: false });

// Queda desde o pico, em fração (0,25 = 25%).
export const drawdownOf = (peak: number, bankroll: number) => (peak > 0 ? Math.max((peak - bankroll) / peak, 0) : 0);

// Maior queda desde o pico ao longo de uma evolução (fração).
export const maxDrawdownOf = (points: { bankroll: number; peak: number }[]) =>
  points.reduce((max, point) => Math.max(max, drawdownOf(point.peak, point.bankroll)), 0);

export function stepDrawdown(state: DrawdownState, bankroll: number, limitPercent: number): DrawdownState {
  if (bankroll >= state.peak) return { peak: bankroll, protecting: false };
  const hit = limitPercent > 0 && drawdownOf(state.peak, bankroll) >= limitPercent / 100 - 1e-9;
  return { peak: state.peak, protecting: state.protecting || hit };
}

// Em proteção, os contratos pela banca atual caem na mesma proporção da queda desde o pico.
export function protectedContracts(contracts: number, bankroll: number, state: DrawdownState) {
  if (!state.protecting) return contracts;
  return Math.floor(contracts * (1 - drawdownOf(state.peak, bankroll)) + 1e-9);
}

// Ponto inicial na data de início, exceto quando já há dia operado nela (evita dia repetido no gráfico).
export const startPoints = <T extends { day: string }>(startDate: string, firstDay: string | undefined, start: T): T[] =>
  firstDay === startDate ? [] : [start];

// Limite fixo ou o vigente em cada dia (histórico de regras).
export type DrawdownLimit = number | ((day: string) => number);

// Evolução da banca dia a dia (curva em ordem cronológica) a partir da banca inicial, com os eventos da proteção.
export function bankrollHistory(initialBankroll: number, startDate: string, curve: EquityPoint[], limit: DrawdownLimit) {
  const limitOn = typeof limit === "number" ? () => limit : limit;
  let state = initialDrawdown(initialBankroll);
  const points = startPoints<BankrollPoint>(startDate, curve[0]?.day, { day: startDate, bankroll: initialBankroll, peak: initialBankroll });
  const events: ProtectionEvent[] = [];

  for (const { day, cumulative } of curve) {
    const bankroll = roundToCents(initialBankroll + cumulative);
    const next = stepDrawdown(state, bankroll, limitOn(day));
    if (next.protecting !== state.protecting) events.push({ day, on: next.protecting, bankroll, peak: state.peak });
    state = next;
    points.push({ day, bankroll, peak: state.peak });
  }
  return {
    points,
    events,
    drawdown: state,
    maxDrawdown: maxDrawdownOf(points),
    bankroll: points.at(-1)?.bankroll ?? initialBankroll,
  };
}
