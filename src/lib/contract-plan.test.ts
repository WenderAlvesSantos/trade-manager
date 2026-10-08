import { describe, expect, it } from "vitest";
import { contractPlan, planMilestones, riskTimelines, streakLoss } from "./contract-plan";
import { TEST_RISK_CONFIG } from "./risk-test-config";

// R$ 514,40 de banca por contrato (stop global 250 pts + taxas, risco 10%).
const config = { ...TEST_RISK_CONFIG, maxContracts: 130 };
const options = { start: { year: 2026, month: 11 }, scenario: { lossDays: 3 }, initialBankroll: 1000 };

describe("planMilestones", () => {
  it("atual, próximo, etapas redondas e o máximo", () => {
    expect(planMilestones(1, 130)).toEqual([1, 2, 3, 5, 10, 15, 20, 30, 40, 50, 75, 100, 130]);
    expect(planMilestones(12, 20)).toEqual([12, 13, 15, 20]);
  });
});

describe("contractPlan", () => {
  it("sem máximo configurado não há plano", () => {
    expect(contractPlan(TEST_RISK_CONFIG, 1000, options)).toBeNull();
    expect(contractPlan({ ...TEST_RISK_CONFIG, maxContracts: undefined as unknown as number }, 1000, options)).toBeNull();
  });

  it("banca necessária, o que falta e a previsão de cada etapa", () => {
    const plan = contractPlan(config, 1000, options)!;
    expect(plan.current).toBe(1);
    expect(plan.steps[0]).toMatchObject({ contracts: 1, reached: true, reachedAt: null });
    const target = plan.steps.at(-1)!;
    expect(target).toMatchObject({ contracts: 130, requiredBankroll: 66872, missing: 65872 });
    expect(target.monthsAhead).toBeGreaterThan(plan.steps[1].monthsAhead!);
  });

  it("cenário sem lucro nunca alcança as etapas", () => {
    const plan = contractPlan(config, 1000, { ...options, scenario: { dailyNetPerContract: -1 } })!;
    expect(plan.steps.slice(1).every((step) => step.reachedAt === null)).toBe(true);
  });
});

describe("riskTimelines", () => {
  it("mais risco chega antes ao máximo, mas perde mais em 4 stops", () => {
    const rows = riskTimelines(config, 1000, options, [5, 25]);
    expect(rows.map((row) => row.riskPercent)).toEqual([5, 10, 25]);
    expect(rows.find((row) => row.riskPercent === 10)?.current).toBe(true);
    const [low, , high] = rows;
    expect(low.targetBankroll).toBeGreaterThan(high.targetBankroll);
    expect(high.monthsAhead!).toBeLessThan(low.monthsAhead ?? Infinity);
    expect(high.streakLoss).toBeGreaterThan(low.streakLoss);
  });
});

describe("streakLoss", () => {
  it("4 stops seguidos com 25% levam ~68% da banca", () => {
    expect(streakLoss(25, 4)).toBeCloseTo(0.6836, 4);
  });
});
