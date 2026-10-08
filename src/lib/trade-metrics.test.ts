import { describe, expect, it } from "vitest";
import type { EquityPoint } from "./trade-aggregations";
import { computeRiskMetrics } from "./trade-metrics";

// Monta a curva a partir dos líquidos diários, já em ordem cronológica.
function curveFrom(nets: number[]): EquityPoint[] {
  let cumulative = 0;
  return nets.map((net, index) => {
    cumulative += net;
    return { day: `2026-10-${String(index + 1).padStart(2, "0")}`, net, cumulative };
  });
}

describe("computeRiskMetrics", () => {
  it("retorna métricas zeradas para período vazio", () => {
    expect(computeRiskMetrics([])).toEqual({
      maxDrawdown: 0,
      maxDrawdownPercent: null,
      maxWinStreak: 0,
      maxLossStreak: 0,
      currentStreak: 0,
    });
  });

  it("mede o drawdown a partir do maior topo do acumulado", () => {
    // Acumulado: 100, 300, 150, 50, 400, 350 → maior queda: 300 → 50.
    const metrics = computeRiskMetrics(curveFrom([100, 200, -150, -100, 350, -50]));
    expect(metrics.maxDrawdown).toBe(250);
    expect(metrics.maxDrawdownPercent).toBeCloseTo(250 / 300);
  });

  it("considera o zero como topo inicial quando o período começa perdendo", () => {
    const metrics = computeRiskMetrics(curveFrom([-100, -50]));
    expect(metrics.maxDrawdown).toBe(150);
    expect(metrics.maxDrawdownPercent).toBeNull();
  });

  it("calcula o percentual só com topo positivo", () => {
    // Acumulado: -100, 100, 50 → % só conta a queda de 100 → 50.
    const metrics = computeRiskMetrics(curveFrom([-100, 200, -50]));
    expect(metrics.maxDrawdown).toBe(100);
    expect(metrics.maxDrawdownPercent).toBeCloseTo(0.5);
  });

  it("não tem drawdown em curva só subindo", () => {
    const metrics = computeRiskMetrics(curveFrom([10, 20, 30]));
    expect(metrics.maxDrawdown).toBe(0);
    expect(metrics.maxDrawdownPercent).toBe(0);
  });

  it("conta as maiores sequências de dias positivos e negativos", () => {
    const metrics = computeRiskMetrics(curveFrom([10, 10, 10, -5, -5, 10, -5, -5, -5, -5]));
    expect(metrics.maxWinStreak).toBe(3);
    expect(metrics.maxLossStreak).toBe(4);
    expect(metrics.currentStreak).toBe(-4);
  });

  it("interrompe a sequência em dia zerado", () => {
    const metrics = computeRiskMetrics(curveFrom([10, 10, 0, 10]));
    expect(metrics.maxWinStreak).toBe(2);
    expect(metrics.currentStreak).toBe(1);
  });
});
