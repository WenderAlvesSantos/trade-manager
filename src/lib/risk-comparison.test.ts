import { describe, expect, it } from "vitest";
import { compareRiskOptions } from "./risk-comparison";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

// Stop global 250 pts + taxas = R$ 51,44 por contrato; banca de R$ 1.000; proteção 20%.
const gainDay = { day: "2026-10-02", points: 300, tradeCount: 3 };
const lossDay = { day: "2026-10-03", points: -250, tradeCount: 3 };
const input = (days = [gainDay, lossDay]) => ({ config, startDate: "2026-10-01", days });

describe("compareRiskOptions", () => {
  it("linha de referência + cada combinação de risco × proteção", () => {
    const { rows } = compareRiskOptions(input(), { risks: [15, 5, 10], drawdowns: [20, 0] });
    expect(rows.map((row) => row.key)).toEqual(["era", "5-0", "5-20", "10-0", "10-20", "15-0", "15-20"]);
    expect(rows[0]).toMatchObject({ era: true, current: false, bankroll: 955.09 });
    expect(rows.find((row) => row.current)?.key).toBe("10-20");
  });

  it("simula o período com o risco fixo", () => {
    const { rows } = compareRiskOptions(input(), { risks: [5, 15], drawdowns: [20] });
    // 5%: R$ 1.028,80 por contrato, não opera.
    expect(rows[1]).toMatchObject({ key: "5-20", bankroll: 1000, returnRate: 0, maxDrawdown: 0, returnPerDrawdown: null });
    // 15%: 2 contratos (+R$ 115,95) e depois 3 (−R$ 154,32).
    expect(rows[2].bankroll).toBe(961.63);
  });

  it("o risco fixo vale por cima das regras de cada época", () => {
    const ruleFor = () => ({ ...config, riskPercent: 5 });
    const { rows } = compareRiskOptions({ ...input(), ruleFor }, { risks: [10], drawdowns: [20] });
    expect(rows[0].bankroll).toBe(1000);
    expect(rows[1].bankroll).toBe(955.09);
  });

  it("sem retorno positivo não há equilíbrio sugerido", () => {
    expect(compareRiskOptions(input(), { risks: [5, 10, 15], drawdowns: [20] }).bestKey).toBeNull();
  });

  it("sem queda em nenhuma opção, vence o maior retorno", () => {
    expect(compareRiskOptions(input([gainDay]), { risks: [5, 10, 15], drawdowns: [20] }).bestKey).toBe("15-20");
  });
});
