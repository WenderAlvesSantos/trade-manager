import type { Asset } from "@/generated/prisma/enums";
import { initialDrawdown, stepDrawdown, type DrawdownState } from "@/lib/bankroll-drawdown";
import { contractsForBankroll, nextContracts } from "@/lib/bankroll-sizing";
import { projectedDayNet, type RiskConfig } from "@/lib/risk-projection";
import { alternateStopSlots, assetOfSlot, assetsDayNet, isAlternate, type StopsMode } from "@/lib/stops-mode";
import { roundToCents } from "@/lib/trade-calculations";

// Dias de stop que ainda faltam no cenário ou um líquido médio diário por contrato.
export type LadderScenario = { pendingLossDays: number } | { dailyNetPerContract: number };

// Onde caem os stops restantes: no começo (aumentos mais tarde), distribuídos ou no fim (aumentos mais cedo,
// mas os stops pegam mais contratos).
export type StopOrder = "first" | "spread" | "last";

// "partial" = só parte dos ativos parou no stop (modo alternado).
export type LadderDayKind = "gain" | "loss" | "partial" | "average";

export type LadderDay = {
  day: string;
  kind: LadderDayKind;
  stoppedAssets: Asset[];
  contracts: number;
  net: number;
  bankroll: number;
  // Contratos para o pregão seguinte quando mudam (null = mantém).
  nextContracts: number | null;
};

export type LadderChange = { day: string; from: number; to: number; afterDays: number };

export type MonthLadder = {
  startContracts: number;
  days: LadderDay[];
  // Mudanças com o pregão em que passam a valer e quantos pregões depois da anterior.
  changes: LadderChange[];
  endContracts: number;
  endBankroll: number;
  // Dias de meta seguidos para liberar +1 contrato a partir de hoje (null = não libera em 60 pregões ou já no máximo).
  gainDaysToNext: number | null;
};

type LadderOptions = {
  bankroll: number;
  drawdown?: DrawdownState;
  pendingDays: string[];
  scenario: LadderScenario;
  order?: StopOrder;
  // Ativos que dividem a banca (configurações reais) e como os stops caem entre eles.
  assets?: RiskConfig[];
  stops?: StopsMode;
};

const MAX_GAIN_DAYS = 60;

export function isStopDay(index: number, total: number, losses: number, order: StopOrder) {
  const count = Math.min(Math.max(losses, 0), total);
  if (order === "first") return index < count;
  if (order === "last") return index >= total - count;
  return Math.floor(((index + 1) * count) / total) > Math.floor((index * count) / total);
}

// Modo alternado: os stops de todos os ativos ocupam pregões distintos na ordem escolhida, em rodízio entre eles.
function alternateStops(index: number, total: number, losses: number, order: StopOrder, assets: Asset[]): Asset[] {
  const slots = alternateStopSlots(losses, assets.length, total);
  if (!isStopDay(index, total, slots, order)) return [];
  let slot = 0;
  for (let previous = 0; previous < index; previous++) if (isStopDay(previous, total, slots, order)) slot++;
  return [assetOfSlot(slot, assets)];
}

type DayOutcome = { kind: LadderDayKind; stoppedAssets: Asset[]; net: number };

function dayOutcome(config: RiskConfig, options: LadderOptions, index: number, contracts: number): DayOutcome {
  const { scenario } = options;
  const total = options.pendingDays.length;
  const order = options.order ?? "first";
  if ("dailyNetPerContract" in scenario) {
    return { kind: "average", stoppedAssets: [], net: contracts > 0 ? roundToCents(scenario.dailyNetPerContract * contracts) : 0 };
  }

  const assets = options.assets ?? [];
  if (isAlternate(options.stops, options.assets)) {
    const stoppedAssets = alternateStops(index, total, scenario.pendingLossDays, order, assets.map((item) => item.asset));
    const net = contracts > 0 ? assetsDayNet(assets, contracts, stoppedAssets) : 0;
    return { kind: stoppedAssets.length > 0 ? "partial" : "gain", stoppedAssets, net };
  }

  const loss = isStopDay(index, total, scenario.pendingLossDays, order);
  return {
    kind: loss ? "loss" : "gain",
    stoppedAssets: loss ? assets.map((item) => item.asset) : [],
    net: contracts > 0 ? projectedDayNet(config, contracts, loss ? "loss" : "gain") : 0,
  };
}

// Quantos dias de meta seguidos a banca precisa para liberar mais que `contracts` (com a folga para subir).
export function gainDaysToIncrease(config: RiskConfig, bankroll: number, drawdown: DrawdownState, contracts: number) {
  if (config.maxContracts > 0 && contracts >= config.maxContracts) return null;
  let state = drawdown;
  let current = bankroll;
  for (let days = 1; days <= MAX_GAIN_DAYS; days++) {
    current = roundToCents(current + projectedDayNet(config, contracts, "gain"));
    state = stepDrawdown(state, current, config.drawdownLimit);
    if (nextContracts(config, current, state, contracts) > contracts) return days;
  }
  return null;
}

// Pregões que faltam no mês, redimensionando os contratos a cada fechamento (risco, margem, proteção, máximo e folga).
// Começa com os contratos atuais (ou menos, se a banca não os comporta).
export function monthLadder(config: RiskConfig, options: LadderOptions): MonthLadder {
  const startState = stepDrawdown(options.drawdown ?? initialDrawdown(options.bankroll), options.bankroll, config.drawdownLimit);
  const startContracts = Math.min(config.contracts, contractsForBankroll(config, options.bankroll, startState).recommended);

  let state = startState;
  let bankroll = options.bankroll;
  let contracts = startContracts;
  let lastChangeIndex = -1;
  const days: LadderDay[] = [];
  const changes: LadderChange[] = [];

  options.pendingDays.forEach((day, index) => {
    const { kind, stoppedAssets, net } = dayOutcome(config, options, index, contracts);
    bankroll = roundToCents(bankroll + net);
    state = stepDrawdown(state, bankroll, config.drawdownLimit);
    const next = nextContracts(config, bankroll, state, contracts);
    days.push({ day, kind, stoppedAssets, contracts, net, bankroll, nextContracts: next !== contracts ? next : null });

    const nextDay = options.pendingDays[index + 1];
    if (next !== contracts && nextDay) {
      changes.push({ day: nextDay, from: contracts, to: next, afterDays: index - lastChangeIndex });
      lastChangeIndex = index;
    }
    contracts = next;
  });

  return {
    startContracts,
    days,
    changes,
    endContracts: contracts,
    endBankroll: bankroll,
    gainDaysToNext: gainDaysToIncrease(config, options.bankroll, startState, startContracts),
  };
}
