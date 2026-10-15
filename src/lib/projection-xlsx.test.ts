import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildProjectionWorkbook } from "./projection-xlsx";
import { TEST_RISK_CONFIG } from "./risk-test-config";

describe("buildProjectionWorkbook", async () => {
  const buffer = await buildProjectionWorkbook({
    assets: ["WIN"],
    header: { initial: 1000, current: 950, forecast: 1100 },
    days: [
      {
        day: "2026-10-16",
        assets: [{ asset: "WIN", contracts: 2, points: -100, result: -40.96 }],
        total: -40.96,
        bankroll: 950,
        plan: 2,
        operated: true,
      },
    ],
    configs: [TEST_RISK_CONFIG],
    settings: { account: "Real", months: 1, stopEvery: 5, generatedOn: "2026-10-16" },
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  it("gera as abas Página1 e Config", () => {
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Página1", "Config"]);
  });

  it("formata moeda, perda em vermelho e congela o cabeçalho", () => {
    const sheet = workbook.getWorksheet("Página1")!;
    expect(sheet.getCell("B3").value).toBe(-50);
    expect(sheet.getCell("A6").value).toBe("Data");
    const result = sheet.getCell("E7");
    expect(result.value).toBe(-40.96);
    expect(result.numFmt).toContain("R$");
    expect(result.font?.color?.argb).toBe("FFDC2626");
    expect(sheet.getColumn(5).width).toBe(19);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 6 });
  });

  it("registra as configurações usadas", () => {
    const values = workbook.getWorksheet("Config")!.getColumn(1).values;
    expect(values).toContain("Stops por ciclo");
    expect(values).toContain("Banca inicial (R$)");
  });
});
