import { describe, expect, it } from "vitest";
import { initialDrawdown } from "./bankroll-drawdown";
import { bankrollForContracts, stopDayCost } from "./bankroll-sizing";
import { combinedConfig, combinedContracts } from "./combined-sizing";
import { projectedDayNet } from "./risk-projection";
import { daysWithinMonths, isWeeklyStop, projectDays } from "./daily-projection";
import type { RiskConfig } from "./risk-projection";
import { TEST_RISK_CONFIG } from "./risk-test-config";

// WIN: R$ 514,40 de banca por contrato. WDO: stop de 10 pts + taxas = R$ 107,20 → R$ 1.072 com risco de 10%.
const win: RiskConfig = { ...TEST_RISK_CONFIG, projectedGainDay: 250, projectedLossDay: 250 };
const wdo: RiskConfig = {
  ...TEST_RISK_CONFIG,
  asset: "WDO",
  dailyStopLimit: 10,
  projectedGainDay: 6,
  projectedLossDay: 10,
  marginPerContract: 0,
};
const both = [win, wdo];

describe("banca combinada", () => {
  it("soma a exigência de cada ativo para a mesma quantidade de contratos", () => {
    const unit = combinedConfig(both);
    expect(bankrollForContracts(unit, 1)).toBeCloseTo(1586.4, 1);
    expect(bankrollForContracts(unit, 2)).toBeCloseTo(3172.8, 1);
    expect(stopDayCost(unit, 1)).toBeCloseTo(stopDayCost(win, 1) + stopDayCost(wdo, 1), 2);
  });

  it("um ativo só: a própria configuração", () => {
    expect(combinedConfig([wdo])).toBe(wdo);
  });

  it("dia de meta e de stop somam os dois ativos, com taxas", () => {
    const unit = combinedConfig(both);
    const separate = (kind: "gain" | "loss") => projectedDayNet(win, 1, kind) + projectedDayNet(wdo, 1, kind);
    expect(projectedDayNet(unit, 1, "loss")).toBeCloseTo(separate("loss"), 1);
    expect(projectedDayNet(unit, 1, "gain")).toBeCloseTo(separate("gain"), 0);
  });

  it("contratos pela banca única; reduções na hora e aumentos com folga", () => {
    expect(combinedContracts(both, 1586.4, initialDrawdown(1586.4), null)).toBe(1);
    expect(combinedContracts(both, 3200, initialDrawdown(3200), null)).toBe(2);
    expect(combinedContracts(both, 1000, initialDrawdown(1000), 2)).toBe(0);
    const buffered = both.map((config) => ({ ...config, increaseBuffer: 2 }));
    expect(combinedContracts(buffered, 3200, initialDrawdown(3200), 1)).toBe(1);
  });

  it("usa o máximo e a proteção mais restritivos", () => {
    const unit = combinedConfig([{ ...win, maxContracts: 20, drawdownLimit: 30 }, { ...wdo, maxContracts: 0 }]);
    expect([unit.maxContracts, unit.drawdownLimit]).toEqual([20, 20]);
    expect(combinedContracts([{ ...win, maxContracts: 3 }, wdo], 100_000, initialDrawdown(100_000), null)).toBe(3);
  });
});

describe("projeção diária", () => {
  it("padrão semanal: cada ativo para 1 vez a cada N pregões, em dias diferentes", () => {
    const stops = (asset: number) => [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((day) => isWeeklyStop(day, asset, 5));
    expect(stops(0)).toEqual([0, 5]);
    expect(stops(1)).toEqual([3, 8]);
  });

  it("acumula o saldo, desconta taxas e IRRF do dia somado e sobe contratos pela banca", () => {
    const days = ["2026-10-15", "2026-10-16", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"];
    const projected = projectDays(both, { days, today: "2026-10-15", bankroll: 3000, stopEvery: 5 });
    const [first, second] = projected;
    expect(first.assets.map((item) => [item.asset, item.kind, item.contracts])).toEqual([
      ["WIN", "loss", 1],
      ["WDO", "gain", 1],
    ]);
    // WIN −250 pts (−R$ 50) + WDO +6 pts (+R$ 60) − taxas (R$ 1,44 + R$ 7,20) = R$ 1,36; IRRF 1% = R$ 0,01.
    expect(first.netResult).toBeCloseTo(1.35, 2);
    expect(second.bankroll).toBeGreaterThan(first.bankroll);
    expect(projected.at(-1)!.nextContracts).toBeGreaterThanOrEqual(1);
  });

  it("limita os pregões ao horizonte em meses", () => {
    const days = ["2026-10-30", "2026-11-03", "2026-12-01", "2027-01-04"];
    expect(daysWithinMonths(days, "2026-10-14", 1)).toEqual(["2026-10-30"]);
    expect(daysWithinMonths(days, "2026-10-14", 3)).toEqual(["2026-10-30", "2026-11-03", "2026-12-01"]);
  });
});
