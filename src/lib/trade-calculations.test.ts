import { describe, expect, it } from "vitest";
import { calculateDailyIrrf, calculateTradeResult, roundToCents } from "./trade-calculations";

describe("calculateTradeResult", () => {
  it("calcula WIN com R$ 0,20 por ponto e R$ 0,48 de taxa por contrato", () => {
    expect(calculateTradeResult({ asset: "WIN", contracts: 2, points: 150 })).toEqual({ grossResult: 60, fees: 0.96 });
  });

  it("calcula WDO com R$ 10 por ponto e R$ 2,40 de taxa por contrato", () => {
    expect(calculateTradeResult({ asset: "WDO", contracts: 3, points: -5.5 })).toEqual({ grossResult: -165, fees: 7.2 });
  });

  it("arredonda para centavos", () => {
    expect(calculateTradeResult({ asset: "WIN", contracts: 3, points: 0.35 }).grossResult).toBe(0.21);
  });
});

describe("calculateDailyIrrf", () => {
  it("cobra 1% do lucro operacional positivo do dia", () => {
    expect(calculateDailyIrrf(1000)).toBe(10);
  });

  it("arredonda o IRRF para centavos", () => {
    expect(calculateDailyIrrf(123.45)).toBe(1.23);
  });

  it("não cobra IRRF em dia zerado ou negativo", () => {
    expect(calculateDailyIrrf(0)).toBe(0);
    expect(calculateDailyIrrf(-500)).toBe(0);
  });
});

describe("roundToCents", () => {
  it("corrige ruído de ponto flutuante", () => {
    expect(roundToCents(0.1 + 0.2)).toBe(0.3);
  });
});
