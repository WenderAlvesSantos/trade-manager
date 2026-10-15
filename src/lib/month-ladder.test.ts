import { describe, expect, it } from "vitest";
import { initialDrawdown } from "./bankroll-drawdown";
import { combinedConfig } from "./combined-sizing";
import { gainDaysToIncrease, monthLadder } from "./month-ladder";
import type { StopsMode } from "./stops-mode";
import type { RiskConfig } from "./risk-projection";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

const pendingDays = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];

describe("monthLadder", () => {
  it("só dias de meta: sobe quando a banca libera e informa a cada quantos pregões", () => {
    const ladder = monthLadder(config, { bankroll: 1000, pendingDays, scenario: { pendingLossDays: 0 } });
    expect(ladder.startContracts).toBe(1);
    expect(ladder.days.every((day) => day.kind === "gain")).toBe(true);
    // 1 dia de meta com 1 contrato (≈ R$ 58) passa dos R$ 1.028,80 de 2 contratos.
    expect(ladder.changes[0]).toEqual({ day: "2026-10-27", from: 1, to: 2, afterDays: 1 });
    expect(ladder.endContracts).toBeGreaterThan(1);
  });

  it("pior caso: os stops restantes vêm primeiro", () => {
    const ladder = monthLadder(config, { bankroll: 1000, pendingDays, scenario: { pendingLossDays: 2 } });
    expect(ladder.days.map((day) => day.kind)).toEqual(["loss", "loss", "gain", "gain", "gain"]);
    expect(ladder.days[0].bankroll).toBeLessThan(1000);
    expect(ladder.days.every((day) => day.contracts <= 1)).toBe(true);
  });

  it("não começa acima do que a banca comporta", () => {
    const ladder = monthLadder({ ...config, contracts: 6 }, { bankroll: 1000, pendingDays, scenario: { pendingLossDays: 0 } });
    expect(ladder.startContracts).toBe(1);
  });

  it("média diária por contrato negativa nunca sobe", () => {
    const ladder = monthLadder(config, { bankroll: 1000, pendingDays, scenario: { dailyNetPerContract: -10 } });
    expect(ladder.changes.every((change) => change.to < change.from)).toBe(true);
  });
});

describe("ordem dos stops", () => {
  it("primeiro, distribuídos ou no fim", () => {
    const kinds = (order: "first" | "spread" | "last") =>
      monthLadder(config, { bankroll: 1000, pendingDays, scenario: { pendingLossDays: 2 }, order }).days.map((day) => day.kind);
    expect(kinds("first")).toEqual(["loss", "loss", "gain", "gain", "gain"]);
    expect(kinds("spread")).toEqual(["gain", "gain", "loss", "gain", "loss"]);
    expect(kinds("last")).toEqual(["gain", "gain", "gain", "loss", "loss"]);
  });

  it("stops no fim sobem antes, mas os stops pegam mais contratos", () => {
    const ladder = (order: "first" | "last") =>
      monthLadder(config, { bankroll: 1000, pendingDays, scenario: { pendingLossDays: 2 }, order });
    const firstIncrease = (order: "first" | "last") => ladder(order).changes.find((change) => change.to > change.from)?.day;
    expect(firstIncrease("last")).toBeDefined();
    expect(firstIncrease("last")! < (firstIncrease("first") ?? "9999-12-31")).toBe(true);
    expect(ladder("last").endBankroll).toBeLessThan(ladder("first").endBankroll);
  });
});

describe("banca única com stops juntos ou alternados", () => {
  const win: RiskConfig = { ...config, projectedGainDay: 250, projectedLossDay: 250 };
  const wdo: RiskConfig = { ...config, asset: "WDO", dailyStopLimit: 10, projectedGainDay: 6, projectedLossDay: 10, marginPerContract: 0 };
  const assets = [win, wdo];
  const unit = combinedConfig(assets);
  const ladder = (stops: StopsMode) =>
    monthLadder(unit, { bankroll: 5000, pendingDays, scenario: { pendingLossDays: 1 }, order: "first", assets, stops });

  it("juntos: o dia de stop pega os dois ativos", () => {
    const days = ladder("together").days;
    expect(days.map((day) => day.kind)).toEqual(["loss", "gain", "gain", "gain", "gain"]);
    expect(days[0].stoppedAssets).toEqual(["WIN", "WDO"]);
  });

  it("alternados: cada ativo para em um pregão diferente", () => {
    const days = ladder("alternate").days;
    expect(days.map((day) => day.kind)).toEqual(["partial", "partial", "gain", "gain", "gain"]);
    expect(days.map((day) => day.stoppedAssets)).toEqual([["WIN"], ["WDO"], [], [], []]);
    // O dia de stop de um ativo só é mais leve, mas a banca final depende de quantos contratos cada stop pega.
    expect(days[0].net).toBeGreaterThan(ladder("together").days[0].net);
  });

  it("um só ativo ignora o modo alternado", () => {
    const single = monthLadder(config, {
      bankroll: 1000,
      pendingDays,
      scenario: { pendingLossDays: 1 },
      assets: [config],
      stops: "alternate",
    });
    expect(single.days[0].kind).toBe("loss");
  });
});

describe("gainDaysToIncrease", () => {
  it("dias de meta seguidos para +1 contrato; null no máximo", () => {
    expect(gainDaysToIncrease(config, 1000, initialDrawdown(1000), 1)).toBe(1);
    expect(gainDaysToIncrease(config, 520, initialDrawdown(520), 1)).toBeGreaterThan(5);
    expect(gainDaysToIncrease({ ...config, maxContracts: 1 }, 1000, initialDrawdown(1000), 1)).toBeNull();
    // Com folga de 2 stops, 2 contratos exigem R$ 1.234,56: 5 dias de meta de ~R$ 57,97 com 1 contrato.
    expect(gainDaysToIncrease({ ...config, increaseBuffer: 2 }, 1000, initialDrawdown(1000), 1)).toBe(5);
  });
});
