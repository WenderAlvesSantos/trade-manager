import type { Asset } from "@/generated/prisma/enums";
import type { Workbook, Worksheet } from "exceljs";
import {
  configSections,
  sheetColumns,
  sheetRows,
  type ProjectionExportSettings,
  type SheetDay,
  type SheetHeader,
  type SheetRow,
} from "@/lib/projection-export";
import type { RiskConfig } from "@/lib/risk-projection";

// Mesmo visual da planilha: moeda com negativos entre parênteses e "-" no zero.
const MONEY_FORMAT = '"R$" #,##0.00;[Red]("R$" #,##0.00);"-"';
const POINTS_FORMAT = "#,##0.##;[Red]-#,##0.##;0";
const COLORS = {
  title: "FF1F2937",
  header: "FF374151",
  white: "FFFFFFFF",
  profit: "FF15803D",
  loss: "FFDC2626",
  projected: "FFF3F4F6",
  muted: "FF9CA3AF",
};

const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

export type WorkbookInput = {
  assets: Asset[];
  header: SheetHeader;
  days: SheetDay[];
  configs: RiskConfig[];
  settings: ProjectionExportSettings;
};

function addSummary(sheet: Worksheet, header: SheetHeader, width: number) {
  sheet.mergeCells(1, 1, 1, width);
  const title = sheet.getCell(1, 1);
  title.value = "GERENCIAMENTO DE DAY TRADE - B3";
  title.font = { bold: true, size: 14, color: { argb: COLORS.white } };
  title.fill = fill(COLORS.title);

  const labels = ["BANCA INICIAL", "LUCRO TOTAL", "SALDO ATUAL", "SALDO PREVISTO"];
  const values = [header.initial, header.current - header.initial, header.current, header.forecast];
  labels.forEach((label, index) => {
    const labelCell = sheet.getCell(2, index + 1);
    labelCell.value = label;
    labelCell.font = { bold: true, color: { argb: COLORS.white } };
    labelCell.fill = fill(COLORS.header);
    const valueCell = sheet.getCell(3, index + 1);
    valueCell.value = values[index];
    valueCell.numFmt = MONEY_FORMAT;
    valueCell.font = { bold: true, color: { argb: values[index] < 0 ? COLORS.loss : COLORS.profit } };
  });
}

function styleRow(sheet: Worksheet, rowNumber: number, row: SheetRow, kinds: string[]) {
  const excelRow = sheet.getRow(rowNumber);
  row.cells.forEach((value, index) => {
    const cell = excelRow.getCell(index + 1);
    cell.value = value;
    if (kinds[index] === "money") cell.numFmt = MONEY_FORMAT;
    if (kinds[index] === "points") cell.numFmt = POINTS_FORMAT;
    if (typeof value === "number" && (kinds[index] === "money" || kinds[index] === "points") && value !== 0) {
      cell.font = { color: { argb: value > 0 ? COLORS.profit : COLORS.loss } };
    }
  });
  if (row.kind === "off") excelRow.font = { color: { argb: COLORS.muted } };
  if (row.kind === "projected") {
    for (let index = 1; index <= kinds.length; index++) excelRow.getCell(index).fill = fill(COLORS.projected);
  }
  if (row.kind === "realized") excelRow.getCell(kinds.length).font = { bold: true, color: { argb: COLORS.profit } };
}

function addDaysSheet(workbook: Workbook, input: WorkbookInput) {
  const columns = sheetColumns(input.assets);
  const sheet = workbook.addWorksheet("Página1", { views: [{ state: "frozen", ySplit: 6 }] });
  columns.forEach((column, index) => (sheet.getColumn(index + 1).width = column.width));
  addSummary(sheet, input.header, columns.length);

  const headerRow = sheet.getRow(6);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.title;
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = fill(COLORS.header);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  headerRow.height = 30;

  const kinds = columns.map((column) => column.kind);
  sheetRows(input.assets, input.days).forEach((row, index) => styleRow(sheet, 7 + index, row, kinds));
}

function addConfigSheet(workbook: Workbook, input: WorkbookInput) {
  const sheet = workbook.addWorksheet("Config");
  sheet.getColumn(1).width = 32;
  sheet.getColumn(2).width = 58;
  for (const section of configSections(input.configs, input.settings)) {
    const titleRow = sheet.addRow([section.title]);
    titleRow.font = { bold: true, color: { argb: COLORS.white } };
    titleRow.getCell(1).fill = fill(COLORS.header);
    titleRow.getCell(2).fill = fill(COLORS.header);
    for (const [label, value] of section.rows) {
      const row = sheet.addRow([label, value]);
      row.getCell(2).alignment = { horizontal: "left" };
      if (label.includes("(R$)") && typeof value === "number") row.getCell(2).numFmt = MONEY_FORMAT;
    }
    sheet.addRow([]);
  }
}

// exceljs é carregado só ao exportar (não pesa no carregamento da página).
export async function buildProjectionWorkbook(input: WorkbookInput) {
  const loaded = await import("exceljs");
  const ExcelJS = ("default" in loaded ? loaded.default : loaded) as typeof import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Megan - Trade Manager";
  addDaysSheet(workbook, input);
  addConfigSheet(workbook, input);
  return workbook.xlsx.writeBuffer();
}
