import { describe, expect, it } from "vitest";
import { bankrollHistory, protectedContracts, stepDrawdown, type DrawdownState } from "./bankroll-drawdown";

describe("stepDrawdown", () => {
  it("liga ao cair o limite desde o pico e só desliga ao voltar ao pico", () => {
    const steps = [1200, 1000, 950, 1100, 1200];
    const states: DrawdownState[] = [];
    let state: DrawdownState = { peak: 1000, protecting: false };
    for (const bankroll of steps) {
      state = stepDrawdown(state, bankroll, 20);
      states.push(state);
    }
    expect(states.map((item) => item.protecting)).toEqual([false, false, true, true, false]);
    expect(states.map((item) => item.peak)).toEqual([1200, 1200, 1200, 1200, 1200]);
  });

  it("limite 0 = proteção desligada", () => {
    expect(stepDrawdown({ peak: 1000, protecting: false }, 100, 0).protecting).toBe(false);
  });
});

describe("protectedContracts", () => {
  it("reduz na proporção da queda só quando protegendo", () => {
    expect(protectedContracts(10, 1500, { peak: 2000, protecting: true })).toBe(7);
    expect(protectedContracts(10, 1500, { peak: 2000, protecting: false })).toBe(10);
  });
});

describe("bankrollHistory", () => {
  const curve = [
    { day: "2026-10-02", net: 200, cumulative: 200 },
    { day: "2026-10-03", net: -300, cumulative: -100 },
  ];

  it("ponto inicial na data de início, banca e pico por dia operado", () => {
    const history = bankrollHistory(1000, "2026-10-01", curve, 20);
    expect(history.points).toEqual([
      { day: "2026-10-01", bankroll: 1000, peak: 1000 },
      { day: "2026-10-02", bankroll: 1200, peak: 1200 },
      { day: "2026-10-03", bankroll: 900, peak: 1200 },
    ]);
    expect(history.bankroll).toBe(900);
    expect(history.drawdown).toEqual({ peak: 1200, protecting: true });
    expect(history.maxDrawdown).toBeCloseTo(0.25, 6);
  });

  it("registra quando a proteção liga e desliga", () => {
    const recovery = [...curve, { day: "2026-10-06", net: 400, cumulative: 300 }];
    expect(bankrollHistory(1000, "2026-10-01", recovery, 20).events).toEqual([
      { day: "2026-10-03", on: true, bankroll: 900, peak: 1200 },
      { day: "2026-10-06", on: false, bankroll: 1300, peak: 1200 },
    ]);
  });

  it("segue o limite de queda vigente em cada dia", () => {
    // Queda de 25% em 03/10: com limite de 30% naquele dia a proteção não liga.
    const limitOn = (day: string) => (day < "2026-10-03" ? 20 : 30);
    expect(bankrollHistory(1000, "2026-10-01", curve, limitOn).events).toEqual([]);
    expect(bankrollHistory(1000, "2026-10-01", curve, (day) => (day < "2026-10-03" ? 30 : 20)).events).toHaveLength(1);
  });

  it("sem ponto inicial duplicado quando opera no dia de início", () => {
    expect(bankrollHistory(1000, "2026-10-02", curve, 20).points).toHaveLength(2);
  });
});
