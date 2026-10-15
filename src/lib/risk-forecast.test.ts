import { describe, expect, it } from "vitest";
import { combinedConfig } from "./combined-sizing";
import { forecastMonths } from "./risk-forecast";
import { projectMonth, type RiskConfig } from "./risk-projection";
import { alternatePeriodNet } from "./stops-mode";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

const options = { startYear: 2026, startMonth: 11, months: 4, scenario: { lossDays: 3 }, initialBankroll: 1000 };

describe("forecastMonths com banca única", () => {
  const win: RiskConfig = { ...config, projectedGainDay: 250, projectedLossDay: 250 };
  const wdo: RiskConfig = { ...config, asset: "WDO", dailyStopLimit: 10, projectedGainDay: 6, projectedLossDay: 10, marginPerContract: 0 };
  const assets = [win, wdo];
  const base = { ...options, initialBankroll: 5000, months: 1, assets };

  it("alternados: cada ativo para nos seus dias, com os mesmos contratos do pior caso", () => {
    const [together] = forecastMonths(combinedConfig(assets), { ...base, stops: "together" });
    const [alternate] = forecastMonths(combinedConfig(assets), { ...base, stops: "alternate" });
    expect(alternate.contracts).toBe(together.contracts);
    expect(alternate.net).toBe(alternatePeriodNet(assets, together.contracts, together.businessDays, 3));
    expect(alternate.net).not.toBe(together.net);
  });

  it("um só ativo ignora o modo alternado", () => {
    const [single] = forecastMonths(config, { ...options, months: 1, assets: [config], stops: "alternate" });
    const [plain] = forecastMonths(config, { ...options, months: 1 });
    expect(single.net).toBe(plain.net);
  });
});

describe("forecastMonths", () => {
  it("usa os pregões de cada mês e vira o ano", () => {
    const months = forecastMonths(config, options);
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual(["2026-11", "2026-12", "2027-1", "2027-2"]);
    // Novembro/2026: 21 dias úteis menos 02/11 (seg) e 20/11 (sex); 15/11 cai no domingo.
    expect(months[0].businessDays).toBe(19);
  });

  it("redimensiona os contratos pela banca ao fim de cada mês", () => {
    // 1 contrato com 3 stops rende R$ 743,20 em 19 pregões: R$ 1.743,20 permite 3 contratos (R$ 514,40 cada).
    const months = forecastMonths(config, options);
    expect(months[0].contracts).toBe(1);
    expect(months[0].nextContracts).toBe(3);
    expect(months[1].contracts).toBe(3);
    expect(months[0].bankroll).toBe(1000 + months[0].net);
  });

  it("compara com contratos fixos", () => {
    const months = forecastMonths(config, options);
    const fixedFirst = projectMonth(config, [], months[0].businessDays, 3).total;
    expect(months[0].fixedBankroll).toBe(1000 + fixedFirst);
    expect(months.at(-1)!.bankroll).toBeGreaterThan(months.at(-1)!.fixedBankroll);
  });

  it("banca insuficiente para 1 contrato: não opera", () => {
    const months = forecastMonths(config, { ...options, initialBankroll: 300 });
    expect(months.every((month) => month.contracts === 0 && month.net === 0)).toBe(true);
  });

  it("cenário de média real escala o líquido diário pelos contratos", () => {
    const months = forecastMonths(config, { ...options, scenario: { dailyNetPerContract: 10 } });
    expect(months[0].net).toBe(190);
  });

  it("média negativa reduz a banca e os contratos", () => {
    // R$ 1.100 − 2 contr. × R$ 5 × 19 pregões = R$ 910 → volta para 1 contrato (queda de 17%, sem proteção).
    const months = forecastMonths(config, { ...options, initialBankroll: 1100, scenario: { dailyNetPerContract: -5 } });
    expect(months[0].contracts).toBe(2);
    expect(months[0].bankroll).toBe(910);
    expect(months[0].nextContracts).toBe(1);
  });

  it("parte da proteção de queda atual", () => {
    // R$ 1.300 comporta 2 contratos, mas está 35% abaixo do pico de R$ 2.000: 2 × 0,65 → 1.
    const drawdown = { peak: 2000, protecting: false };
    const months = forecastMonths(config, { ...options, initialBankroll: 1300, drawdown, scenario: { dailyNetPerContract: 0 } });
    expect(months[0].contracts).toBe(1);
  });
});
