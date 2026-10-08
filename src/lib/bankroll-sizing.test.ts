import { describe, expect, it } from "vitest";
import { bankrollForContracts, bankrollLevels, bankrollStatus, contractsForBankroll, stopDayCost } from "./bankroll-sizing";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

// Dia de stop por contrato: stop global de 250 pts × R$ 0,20 + 3 × R$ 0,48 = R$ 51,44.
// Risco de 10% → R$ 514,40 de banca por contrato.

describe("stopDayCost", () => {
  it("usa o stop global configurado, não a perda projetada", () => {
    expect(stopDayCost(config, 1)).toBe(51.44);
    const highProjectedLoss = { ...config, projectedLossDay: 999 };
    expect(stopDayCost(highProjectedLoss, 2)).toBe(102.88);
  });

  it("WDO: 10 pts × R$ 10 + 3 × R$ 2,40", () => {
    expect(stopDayCost({ ...config, asset: "WDO", dailyStopLimit: 10 }, 1)).toBe(107.2);
  });
});

describe("contractsForBankroll", () => {
  it("R$ 1.000: a margem permite 6, o risco permite 1", () => {
    expect(contractsForBankroll(config, 1000)).toEqual({ byRisk: 1, byMargin: 6, unprotected: 1, recommended: 1 });
  });

  it("margem 0 = sem teto pela corretora", () => {
    expect(contractsForBankroll({ ...config, marginPerContract: 0 }, 1000).byMargin).toBeNull();
  });

  it("banca abaixo do mínimo de 1 contrato", () => {
    expect(contractsForBankroll(config, 500).recommended).toBe(0);
  });

  it("a margem limita quando o risco permitido é alto", () => {
    expect(contractsForBankroll({ ...config, riskPercent: 100 }, 1000).recommended).toBe(6);
  });

  it("em proteção, reduz na mesma proporção da queda desde o pico", () => {
    // R$ 2.000 comporta 3 contratos; 20% abaixo do pico de R$ 2.500 → 3 × 0,8 = 2.
    const result = contractsForBankroll(config, 2000, { peak: 2500, protecting: true });
    expect(result).toMatchObject({ unprotected: 3, recommended: 2 });
  });
});

describe("bankrollForContracts", () => {
  it("cresce R$ 514,40 por contrato com risco de 10%", () => {
    expect(bankrollForContracts(config, 1)).toBe(514.4);
    expect(bankrollForContracts(config, 2)).toBe(1028.8);
  });

  it("usa a margem quando ela é o limite maior", () => {
    expect(bankrollForContracts({ ...config, riskPercent: 100 }, 2)).toBe(310);
  });
});

describe("bankrollStatus", () => {
  it("mantém 1 contrato com R$ 1.000 e mostra quanto falta para 2", () => {
    const status = bankrollStatus(config, 1000);
    expect(status.suggestion).toBe("manter");
    expect(status.requiredForNext).toBe(1028.8);
    expect(status.currentStopCost).toBe(51.44);
    expect(status.stopDaysToRuin).toBe(19);
  });

  it("sugere subir quando a banca comporta mais contratos", () => {
    const status = bankrollStatus(config, 1900);
    expect(status.suggestion).toBe("subir");
    expect(status.suggestedContracts).toBe(3);
  });

  it("sugere rebaixar quando a banca cai, nunca abaixo de 1", () => {
    expect(bankrollStatus({ ...config, contracts: 6 }, 1000)).toMatchObject({ suggestion: "rebaixar", suggestedContracts: 1 });
    expect(bankrollStatus(config, 300).suggestion).toBe("manter");
  });

  it("proteção ativa rebaixa mesmo com banca suficiente", () => {
    const status = bankrollStatus({ ...config, contracts: 3 }, 2000, { peak: 2500, protecting: true });
    expect(status).toMatchObject({ suggestion: "rebaixar", suggestedContracts: 2, protecting: true, drawdown: 0.2, peak: 2500 });
  });

  it("sem banca configurada não sugere mudanças", () => {
    expect(bankrollStatus({ ...config, initialBankroll: 0, contracts: 6 }, 0).suggestion).toBe("manter");
  });
});

describe("bankrollLevels", () => {
  it("lista os patamares até o atual + 4 com quanto falta", () => {
    const levels = bankrollLevels(config, 1000);
    expect(levels).toHaveLength(5);
    expect(levels[0]).toMatchObject({ contracts: 1, requiredBankroll: 514.4, missing: 0 });
    expect(levels[1]).toMatchObject({ contracts: 2, requiredBankroll: 1028.8, missing: 28.8 });
  });

  it("para no máximo de contratos configurado", () => {
    expect(bankrollLevels({ ...config, maxContracts: 3 }, 1000)).toHaveLength(3);
  });
});

describe("máximo de contratos", () => {
  const capped = { ...config, maxContracts: 130 };

  it("a banca não recomenda acima do máximo", () => {
    expect(contractsForBankroll(capped, 10_000_000).recommended).toBe(130);
    expect(contractsForBankroll(config, 10_000_000).recommended).toBeGreaterThan(130);
  });

  it("sinaliza quando já opera o máximo", () => {
    expect(bankrollStatus({ ...capped, contracts: 130 }, 10_000_000).atMax).toBe(true);
    expect(bankrollStatus({ ...capped, contracts: 129 }, 10_000_000).atMax).toBe(false);
  });
});
