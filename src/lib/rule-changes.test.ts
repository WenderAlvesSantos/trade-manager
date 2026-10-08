import { describe, expect, it } from "vitest";
import { ruleChanges } from "./rule-changes";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

const version = (effectiveFrom: string, changes: Partial<typeof config> = {}) => ({ ...config, ...changes, effectiveFrom });

describe("ruleChanges", () => {
  it("descreve só os campos alterados em relação à versão anterior", () => {
    const history = [
      version("2000-01-01"),
      version("2026-10-05", { riskPercent: 15, drawdownLimit: 0 }),
      version("2026-10-09", { riskPercent: 15, drawdownLimit: 0, dailyStopLimit: 300 }),
      version("2026-10-12", { riskPercent: 15, drawdownLimit: 0, dailyStopLimit: 300, maxContracts: 130 }),
    ];
    expect(ruleChanges(history, "2026-10-01")).toEqual([
      { day: "2026-10-05", changes: ["risco 10%→15%", "proteção 20%→desligada"] },
      { day: "2026-10-09", changes: ["stop 250 pts→300 pts"] },
      { day: "2026-10-12", changes: ["máximo sem limite→130 contr."] },
    ]);
  });

  it("ignora a base e versões antes do início da banca", () => {
    const history = [version("2000-01-01"), version("2026-09-20", { riskPercent: 5 })];
    expect(ruleChanges(history, "2026-10-01")).toEqual([]);
  });
});
