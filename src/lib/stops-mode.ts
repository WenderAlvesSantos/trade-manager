import type { Asset } from "@/generated/prisma/enums";
import { projectAsset, sumAssets } from "@/lib/daily-projection";
import type { RiskConfig } from "@/lib/risk-projection";
import { roundToCents } from "@/lib/trade-calculations";

// Banca única com vários ativos: "together" = o dia de stop pega todos os ativos (pior caso); "alternate" = cada
// ativo tem os stops do cenário em pregões diferentes (como a projeção da listagem de Trades).
export type StopsMode = "together" | "alternate";

export const parseStopsMode = (raw: unknown): StopsMode | null => (raw === "together" || raw === "alternate" ? raw : null);

export const isAlternate = (stops: StopsMode | undefined, assets: RiskConfig[] | undefined): assets is RiskConfig[] =>
  stops === "alternate" && (assets?.length ?? 0) > 1;

// Pregões com stop no modo alternado: um por ativo e por stop, limitado aos pregões disponíveis.
export const alternateStopSlots = (losses: number, assetCount: number, total: number) =>
  Math.min(Math.max(losses, 0) * assetCount, total);

// Ativo que para no `slot`-ésimo pregão de stop (rodízio entre os ativos).
export const assetOfSlot = (slot: number, assets: Asset[]) => assets[slot % assets.length];

// Líquido do dia somando os ativos: os de `stopped` no stop, os demais na meta (IRRF sobre o dia somado).
export function assetsDayNet(assets: RiskConfig[], contracts: number, stopped: Asset[]) {
  const projected = assets.map((item) => projectAsset(item, contracts, stopped.includes(item.asset) ? "loss" : "gain"));
  return sumAssets(projected, contracts).netResult;
}

// Líquido de `days` pregões com contratos fixos no modo alternado (a ordem dos stops não muda o total).
export function alternatePeriodNet(assets: RiskConfig[], contracts: number, days: number, losses: number) {
  if (contracts <= 0) return 0;
  const slots = alternateStopSlots(losses, assets.length, days);
  const symbols = assets.map((item) => item.asset);
  let total = 0;
  for (let index = 0; index < days; index++) {
    total += assetsDayNet(assets, contracts, index < slots ? [assetOfSlot(index, symbols)] : []);
  }
  return roundToCents(total);
}
