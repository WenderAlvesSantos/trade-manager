import type { Asset } from "@/generated/prisma/enums";
import { addDays } from "@/lib/b3-calendar";
import type { ProjectedDay } from "@/lib/daily-projection";
import type { RiskConfig } from "@/lib/risk-projection";

// Linha da planilha de gerenciamento: um dia, com contratos/pontos/resultado por ativo e o saldo combinado.
export type SheetAsset = { asset: Asset; contracts: number; points: number; result: number };
export type SheetDay = {
  day: string;
  assets: SheetAsset[];
  total: number;
  bankroll: number | null;
  plan: number | null;
  operated: boolean;
};
export type SheetHeader = { initial: number; current: number; forecast: number };

export function sheetDayFromProjected(day: ProjectedDay): SheetDay {
  return {
    day: day.day,
    assets: day.assets.map((item) => ({
      asset: item.asset,
      contracts: item.contracts,
      points: item.points,
      result: Math.round((item.grossResult - item.fees) * 100) / 100,
    })),
    total: day.netResult,
    bankroll: day.bankroll,
    plan: day.nextContracts,
    operated: false,
  };
}

export type CellValue = string | number | null;
export type ColumnKind = "date" | "text" | "contracts" | "points" | "money";
export type SheetColumn = { title: string; kind: ColumnKind; width: number };
// "realized" = operado; "projected" = projeção; "off" = fim de semana, feriado ou pregão sem operação.
export type SheetRow = { kind: "realized" | "projected" | "off"; cells: CellValue[] };

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });
const weekday = (day: string) => {
  const name = weekdayFormatter.format(new Date(`${day}T00:00:00Z`));
  return name.charAt(0).toUpperCase() + name.slice(1);
};
export const brDate = (day: string) => day.split("-").reverse().join("/");

export function sheetColumns(assets: Asset[]): SheetColumn[] {
  return [
    { title: "Data", kind: "date", width: 12 },
    { title: "Dia da Semana", kind: "text", width: 15 },
    ...assets.flatMap((asset): SheetColumn[] => [
      { title: `Contratos ${asset}`, kind: "contracts", width: 14 },
      { title: `Pontos ${asset}`, kind: "points", width: 12 },
      { title: `Resultado ${asset} (R$)`, kind: "money", width: 19 },
    ]),
    { title: "Resultado Total (R$)", kind: "money", width: 20 },
    { title: "Saldo Acumulado (R$)", kind: "money", width: 21 },
    { title: "Plano de Contratos", kind: "contracts", width: 18 },
    { title: "Operado?", kind: "text", width: 11 },
  ];
}

function dayRow(assets: Asset[], day: SheetDay): SheetRow {
  const perAsset = assets.flatMap((asset) => {
    const item = day.assets.find((entry) => entry.asset === asset);
    return item ? [item.contracts, item.points, item.result] : [null, null, null];
  });
  return {
    kind: day.operated ? "realized" : "projected",
    cells: [brDate(day.day), weekday(day.day), ...perAsset, day.total, day.bankroll, day.plan, day.operated ? "Sim" : "Não"],
  };
}

// Um dia corrido por linha, em ordem; dias sem dados aparecem como "Não", como na planilha.
export function sheetRows(assets: Asset[], days: SheetDay[]): SheetRow[] {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const byDay = new Map(sorted.map((day) => [day.day, day]));
  const first = sorted[0]?.day;
  const last = sorted.at(-1)?.day;
  if (!first || !last) return [];
  const blanks: CellValue[] = Array(assets.length * 3 + 3).fill(null);
  const rows: SheetRow[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) {
    const found = byDay.get(day);
    rows.push(found ? dayRow(assets, found) : { kind: "off", cells: [brDate(day), weekday(day), ...blanks, "Não"] });
  }
  return rows;
}

export type ProjectionExportSettings = { account: string; months: number; stopEvery: number; generatedOn: string };
export type ConfigSection = { title: string; rows: [string, CellValue][] };

const pct = (value: number) => `${value.toLocaleString("pt-BR")}%`;

// Aba "Config": parâmetros da projeção e a regra de cada ativo usada no dimensionamento.
export function configSections(configs: RiskConfig[], settings: ProjectionExportSettings): ConfigSection[] {
  return [
    {
      title: "Projeção",
      rows: [
        ["Conta", settings.account],
        ["Gerado em", brDate(settings.generatedOn)],
        ["Horizonte", `${settings.months} ${settings.months === 1 ? "mês" : "meses"}`],
        ["Stops por ciclo", `1 stop a cada ${settings.stopEvery} pregões por ativo`],
        ["Banca", `Combinada (${configs.map((config) => config.asset).join(" + ")}), mesma quantidade de contratos`],
        ["Custos", "Taxas B3 por contrato e IRRF de 1% sobre o lucro do dia"],
      ],
    },
    ...configs.map((config) => ({
      title: config.asset,
      rows: [
        ["Banca inicial (R$)", config.initialBankroll],
        ["Início da banca", brDate(config.bankrollStartDate)],
        ["Risco máximo por dia de stop", pct(config.riskPercent)],
        ["Stop global (pts)", config.dailyStopLimit],
        ["Meta global (pts)", config.dailyGainTarget],
        ["Resultado do dia de meta (pts)", config.projectedGainDay],
        ["Resultado do dia de stop (pts)", -config.projectedLossDay],
        ["Trades médios por dia", config.avgTradesPerDay],
        ["Margem por contrato (R$)", config.marginPerContract > 0 ? config.marginPerContract : "sem teto"],
        ["Proteção: queda desde o pico", config.drawdownLimit > 0 ? pct(config.drawdownLimit) : "desligada"],
        ["Máximo de contratos", config.maxContracts > 0 ? config.maxContracts : "sem limite"],
        ["Folga para subir (stops)", config.increaseBuffer > 0 ? config.increaseBuffer : "sem folga"],
      ] satisfies [string, CellValue][],
    })),
  ];
}
