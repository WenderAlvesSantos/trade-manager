import { describe, expect, it } from "vitest";
import { simulatedDayNet, simulateRecommendations, simulationDays } from "./bankroll-simulation";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";
import type { DaySummary } from "./trade-aggregations";

// R$ 514,40 de banca por contrato (stop global 250 pts + taxas, risco 10%).
const days = [
  { day: "2026-10-02", points: 300, tradeCount: 3 },
  { day: "2026-10-03", points: -250, tradeCount: 3 },
];

describe("simulatedDayNet", () => {
  it("escala bruto e taxas pelos contratos e desconta IRRF do lucro", () => {
    // 300 pts × R$ 0,20 − 3 × R$ 0,48 = R$ 58,56; IRRF R$ 0,59.
    expect(simulatedDayNet("WIN", days[0], 1)).toBe(57.97);
    expect(simulatedDayNet("WIN", days[1], 2)).toBe(-102.88);
    expect(simulatedDayNet("WIN", days[0], 0)).toBe(0);
  });
});

describe("simulateRecommendations", () => {
  it("reajusta os contratos pelo fechamento do dia anterior", () => {
    // R$ 1.000 → 1 contrato; R$ 1.057,97 → 2 contratos no dia seguinte.
    const result = simulateRecommendations(config, "2026-10-01", days);
    expect(result.points.map((point) => point.contracts)).toEqual([1, 1, 2]);
    expect(result.bankroll).toBe(955.09);
    expect(result.contractChanges).toBe(1);
    // Pico R$ 1.057,97 → R$ 955,09.
    expect(result.maxDrawdown).toBeCloseTo((1057.97 - 955.09) / 1057.97, 6);
  });

  it("usa o stop global vigente em cada dia", () => {
    // Até 02/10 stop de 500 pts (R$ 101,44/contr. → R$ 1.000 não comporta 1); depois 250 pts → 1 contrato.
    const ruleFor = (day: string) => ({ ...config, dailyStopLimit: day < "2026-10-03" ? 500 : 250 });
    const result = simulateRecommendations(config, "2026-10-01", days, ruleFor);
    expect(result.points.map((point) => point.contracts)).toEqual([0, 0, 1]);
    expect(result.bankroll).toBe(948.56);
  });

  it("usa risco % e margem vigentes em cada dia", () => {
    // Até 02/10 risco de 5% (não comporta 1 contrato); depois 10% → 1 contrato.
    const ruleFor = (day: string) => ({ ...config, riskPercent: day < "2026-10-03" ? 5 : 10 });
    expect(simulateRecommendations(config, "2026-10-01", days, ruleFor).bankroll).toBe(948.56);
  });

  it("banca abaixo de 1 contrato não opera", () => {
    const result = simulateRecommendations({ ...config, initialBankroll: 400 }, "2026-10-01", days);
    expect(result.bankroll).toBe(400);
  });
});

describe("simulationDays", () => {
  it("ordena do mais antigo e usa os pontos líquidos do ativo", () => {
    const summaries = [
      { day: "2026-10-03", tradeCount: 2, pointsByAsset: { WIN: { gained: 100, lost: 150 } } },
      { day: "2026-10-02", tradeCount: 1, pointsByAsset: {} },
    ] as unknown as DaySummary[];
    expect(simulationDays(summaries, "WIN")).toEqual([
      { day: "2026-10-02", points: 0, tradeCount: 1 },
      { day: "2026-10-03", points: -50, tradeCount: 2 },
    ]);
  });
});
