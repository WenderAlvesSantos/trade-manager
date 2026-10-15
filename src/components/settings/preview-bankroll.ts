import { ASSETS, type RiskConfig } from "@/lib/risk-projection";
import type { EquityPoint } from "@/lib/trade-aggregations";

export type PreviewBankrollSource = {
  bankrollCurve: EquityPoint[];
  // Outros ativos operados na conta (configuração salva) e a curva da banca única da conta.
  otherAssets: RiskConfig[];
  combinedCurve: EquityPoint[];
};

// Banca da prévia: com outros ativos operados, a da conta (este ativo com os valores do formulário).
export function previewBankroll(preview: RiskConfig & { active?: boolean }, source: PreviewBankrollSource) {
  if (!preview.active || source.otherAssets.length === 0) return { configs: [preview], curve: source.bankrollCurve };
  const configs = [preview, ...source.otherAssets].sort((a, b) => ASSETS.indexOf(a.asset) - ASSETS.indexOf(b.asset));
  return { configs, curve: source.combinedCurve };
}
