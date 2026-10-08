import { describe, expect, it } from "vitest";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { TEST_RISK_CONFIG as config } from "@/lib/risk-test-config";
import { evolutionChart } from "./bankroll-evolution-data";

const data = {
  config,
  today: "2026-10-08",
  bankrollHistory: [
    { day: "2026-10-01", bankroll: 1000, peak: 1000 },
    { day: "2026-10-02", bankroll: 1100, peak: 1100 },
  ],
  simulation: { points: [{ day: "2026-10-01", bankroll: 1000, peak: 1000, contracts: 1 }] },
  contractChanges: [{ day: "2026-10-04", from: 1, to: 2 }],
  ruleHistory: [
    { ...config, effectiveFrom: "2000-01-01" },
    { ...config, effectiveFrom: "2026-10-04", riskPercent: 15 },
  ],
  protectionEvents: [],
} as unknown as RiskDashboardData;

describe("evolutionChart", () => {
  it("estende até hoje e inclui dias de eventos sem pregão, repetindo a última banca", () => {
    const banca = evolutionChart(data).series.filter((point) => point.series === "Banca");
    expect(banca.map((point) => [point.label, point.value])).toEqual([
      ["01/10/2026", 1000],
      ["02/10/2026", 1100],
      ["04/10/2026", 1100],
      ["08/10/2026", 1100],
    ]);
  });

  it("rótulo curto na marcação e texto completo no tooltip do dia", () => {
    const { markers, details } = evolutionChart(data);
    expect(markers).toEqual([{ label: "04/10/2026", text: "1→2 · Regra", color: expect.any(String) }]);
    expect(details["04/10/2026"]).toBe("Contratos: 1 → 2 | Regra: risco 10%→15%");
  });
});
