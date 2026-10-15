import { describe, expect, it } from "vitest";
import { TEST_RISK_CONFIG } from "./risk-test-config";
import { configSections, sheetColumns, sheetRows, type SheetDay } from "./projection-export";

const realized: SheetDay = {
  day: "2026-10-16",
  assets: [
    { asset: "WIN", contracts: 4, points: -224, result: -179.2 },
    { asset: "WDO", contracts: 6, points: -10, result: -570 },
  ],
  total: -749.2,
  bankroll: 1150.8,
  plan: 1,
  operated: true,
};

const projected: SheetDay = {
  day: "2026-10-19",
  assets: [
    { asset: "WIN", contracts: 1, points: 250, result: 48.56 },
    { asset: "WDO", contracts: 1, points: 6, result: 52.8 },
  ],
  total: 100.35,
  bankroll: 1251.15,
  plan: 2,
  operated: false,
};

describe("sheetColumns", () => {
  it("colunas da planilha com três colunas por ativo", () => {
    expect(sheetColumns(["WIN", "WDO"]).map((column) => column.title)).toEqual([
      "Data",
      "Dia da Semana",
      "Contratos WIN",
      "Pontos WIN",
      "Resultado WIN (R$)",
      "Contratos WDO",
      "Pontos WDO",
      "Resultado WDO (R$)",
      "Resultado Total (R$)",
      "Saldo Acumulado (R$)",
      "Plano de Contratos",
      "Operado?",
    ]);
  });
});

describe("sheetRows", () => {
  const rows = sheetRows(["WIN", "WDO"], [projected, realized]);

  it("um dia corrido por linha, em ordem, com o tipo de cada linha", () => {
    expect(rows.map((row) => row.kind)).toEqual(["realized", "off", "off", "projected"]);
    expect(rows[0].cells).toEqual(["16/10/2026", "Sexta-feira", 4, -224, -179.2, 6, -10, -570, -749.2, 1150.8, 1, "Sim"]);
    expect(rows[3].cells).toEqual(["19/10/2026", "Segunda-feira", 1, 250, 48.56, 1, 6, 52.8, 100.35, 1251.15, 2, "Não"]);
  });

  it("dia sem operação ocupa as mesmas colunas, com Não em Operado?", () => {
    expect(rows[1].cells).toHaveLength(12);
    expect(rows[1].cells[1]).toBe("Sábado");
    expect(rows[1].cells.at(-1)).toBe("Não");
  });

  it("sem dias, sem linhas", () => {
    expect(sheetRows(["WIN"], [])).toEqual([]);
  });
});

describe("configSections", () => {
  const sections = configSections([TEST_RISK_CONFIG], {
    account: "Real",
    months: 3,
    stopEvery: 5,
    generatedOn: "2026-10-14",
  });

  it("parâmetros da projeção e uma seção por ativo", () => {
    expect(sections.map((section) => section.title)).toEqual(["Projeção", TEST_RISK_CONFIG.asset]);
    expect(sections[0].rows).toContainEqual(["Horizonte", "3 meses"]);
    expect(sections[0].rows).toContainEqual(["Stops por ciclo", "1 stop a cada 5 pregões por ativo"]);
    expect(sections[1].rows).toContainEqual(["Banca inicial (R$)", TEST_RISK_CONFIG.initialBankroll]);
  });
});
