import { describe, expect, it } from "vitest";
import {
  breakEvenLossDays,
  dailyRisk,
  minimumWinRate,
  projectedDayNet,
  projectMonth,
  projectMonthAtAverage,
} from "./risk-projection";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

describe("projectedDayNet", () => {
  it("dia de meta: bruto - taxas - IRRF de 1%", () => {
    // 300 pts × 0,20 = 60; taxas 3 × 0,48 = 1,44; lucro op. 58,56; IRRF 0,59.
    expect(projectedDayNet(config, 1, "gain")).toBe(57.97);
  });

  it("dia de stop: sem IRRF", () => {
    expect(projectedDayNet(config, 1, "loss")).toBe(-61.44);
    expect(dailyRisk(config, 1)).toBe(61.44);
  });

  it("escala com o número de contratos", () => {
    expect(projectedDayNet(config, 10, "loss")).toBe(-614.4);
  });
});

describe("projectMonth", () => {
  it("distribui os stops restantes entre os dias pendentes", () => {
    const projection = projectMonth(config, [100, -50], 10, 3);
    expect(projection.realizedNet).toBe(50);
    expect(projection.realizedLossDays).toBe(1);
    expect(projection.pendingLossDays).toBe(2);
    expect(projection.pendingGainDays).toBe(8);
    expect(projection.pendingNet).toBe(8 * 57.97 - 2 * 61.44);
    expect(projection.total).toBe(50 + 8 * 57.97 - 2 * 61.44);
  });

  it("não projeta stops pendentes se o mês já teve todos", () => {
    const projection = projectMonth(config, [-10, -10, -10, -10], 5, 3);
    expect(projection.pendingLossDays).toBe(0);
    expect(projection.pendingGainDays).toBe(5);
  });

  it("limita os stops à quantidade de dias pendentes", () => {
    expect(projectMonth(config, [], 2, 4).pendingLossDays).toBe(2);
  });
});

describe("projectMonthAtAverage", () => {
  it("repete a média dos dias operados nos pendentes", () => {
    const projection = projectMonthAtAverage([100, -40, 60], 10);
    expect(projection).toEqual({ realizedDays: 3, sampleDays: 3, average: 40, realizedNet: 120, pendingNet: 400, total: 520 });
  });

  it("sem dias operados não há cenário", () => {
    expect(projectMonthAtAverage([], 20)).toBeNull();
  });

  it("média móvel: amostra própria, mesmo no início do mês sem dias operados", () => {
    const projection = projectMonthAtAverage([], 20, [50, -20, 30]);
    expect(projection).toMatchObject({ realizedDays: 0, sampleDays: 3, average: 20, realizedNet: 0, pendingNet: 400, total: 400 });
  });
});

describe("breakEvenLossDays", () => {
  it("calcula quantos stops o mês aguenta sem fechar negativo", () => {
    // 21 × 57,97 / (57,97 + 61,44) = 10,19
    expect(breakEvenLossDays(config, 21)).toBe(10);
  });
});

describe("minimumWinRate", () => {
  it("alvo 100 × stop 150 exige 60% de acerto", () => {
    expect(minimumWinRate(config)).toBe(0.6);
  });
});
