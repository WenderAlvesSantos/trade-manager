import { describe, expect, it } from "vitest";
import { buildDaySummaries, buildEquityCurve, calculateProfitFactor, summarizePeriod } from "./trade-aggregations";
import type { DailyAssetRow } from "./trades";

const row = (overrides: Partial<DailyAssetRow>): DailyAssetRow => ({
  day: "2026-10-01",
  asset: "WIN",
  tradeCount: 1,
  wins: 0,
  grossResult: 0,
  fees: 0,
  pointsGained: 0,
  pointsLost: 0,
  tradeProfit: 0,
  tradeLoss: 0,
  contracts: 1,
  ...overrides,
});

describe("buildDaySummaries", () => {
  it("calcula o IRRF sobre o lucro operacional do dia somando todos os ativos", () => {
    const [day] = buildDaySummaries([
      row({ asset: "WIN", tradeCount: 2, wins: 1, grossResult: 300, fees: 1.92 }),
      row({ asset: "WDO", tradeCount: 1, grossResult: -100, fees: 2.4 }),
    ]);

    expect(day.operatingProfit).toBe(195.68);
    expect(day.irrf).toBe(1.96);
    expect(day.netResult).toBe(193.72);
    expect(day.tradeCount).toBe(3);
    expect(day.winRate).toBeCloseTo(1 / 3);
  });

  it("não cobra IRRF em dia negativo", () => {
    const [day] = buildDaySummaries([row({ grossResult: -50, fees: 0.48 })]);
    expect(day.irrf).toBe(0);
    expect(day.netResult).toBe(-50.48);
  });

  it("mantém pontos separados por ativo", () => {
    const [day] = buildDaySummaries([
      row({ asset: "WIN", pointsGained: 300, pointsLost: 100 }),
      row({ asset: "WDO", pointsGained: 0, pointsLost: 5 }),
    ]);
    expect(day.pointsByAsset).toEqual({ WIN: { gained: 300, lost: 100 }, WDO: { gained: 0, lost: 5 } });
  });

  it("agrupa linhas por dia preservando a ordem recebida", () => {
    const days = buildDaySummaries([
      row({ day: "2026-10-02", asset: "WIN" }),
      row({ day: "2026-10-02", asset: "WDO" }),
      row({ day: "2026-10-01" }),
    ]);
    expect(days.map((day) => day.day)).toEqual(["2026-10-02", "2026-10-01"]);
  });
});

describe("summarizePeriod", () => {
  const days = buildDaySummaries([
    row({ day: "2026-10-02", grossResult: 200, fees: 0, wins: 1, tradeProfit: 200 }),
    row({ day: "2026-10-01", tradeCount: 2, grossResult: -100, fees: 0, tradeLoss: 100, pointsLost: 500 }),
  ]);
  const summary = summarizePeriod(days);

  it("soma o IRRF de cada dia, sem compensar dias negativos", () => {
    expect(summary.irrf).toBe(2);
    expect(summary.netResult).toBe(98);
  });

  it("calcula win rate sobre o total de trades", () => {
    expect(summary.tradeCount).toBe(3);
    expect(summary.winRate).toBeCloseTo(1 / 3);
  });

  it("calcula o fator de lucro como ganhos ÷ perdas", () => {
    expect(summary.profitFactor).toBe(2);
  });

  it("acumula pontos ganhos e perdidos por ativo", () => {
    expect(summary.pointsByAsset).toEqual({ WIN: { gained: 0, lost: 500 } });
  });

  it("retorna resumo zerado sem dias", () => {
    expect(summarizePeriod([])).toMatchObject({ tradeCount: 0, winRate: 0, netResult: 0, profitFactor: null });
  });
});

describe("calculateProfitFactor", () => {
  it("retorna null quando não há perdas", () => {
    expect(calculateProfitFactor(500, 0)).toBeNull();
  });

  it("retorna valor abaixo de 1 quando as perdas superam os ganhos", () => {
    expect(calculateProfitFactor(50, 200)).toBe(0.25);
  });
});

describe("buildEquityCurve", () => {
  it("monta a curva em ordem cronológica com acumulado", () => {
    const days = buildDaySummaries([
      row({ day: "2026-10-02", grossResult: -30 }),
      row({ day: "2026-10-01", grossResult: 100 }),
    ]);
    expect(buildEquityCurve(days)).toEqual([
      { day: "2026-10-01", net: 99, cumulative: 99 },
      { day: "2026-10-02", net: -30, cumulative: 69 },
    ]);
  });
});
