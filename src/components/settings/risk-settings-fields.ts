import type { RiskSettingsInput } from "@/lib/validations";

type FieldName = Exclude<keyof RiskSettingsInput, "active" | "bankrollStartDate">;

export type FieldDef = {
  name: FieldName;
  label: string;
  suffix?: string;
  prefix?: string;
  tooltip?: string;
  min?: number;
  step?: number;
};

export type FieldGroup = { key: "robo" | "projecao" | "banca"; title: string; description: string; fields: FieldDef[] };

export const FIELD_GROUPS: FieldGroup[] = [
  {
    key: "robo",
    title: "Robô",
    description: "Limites em que o robô para de operar no dia e alvo/stop de cada entrada.",
    fields: [
      { name: "dailyGainTarget", label: "Meta global de ganho", suffix: "pts" },
      { name: "dailyStopLimit", label: "Stop global de perda", suffix: "pts" },
      { name: "tradeTarget", label: "Alvo por trade", suffix: "pts" },
      { name: "tradeStop", label: "Stop por trade", suffix: "pts" },
      {
        name: "deviationTolerance",
        label: "Tolerância de desvio",
        suffix: "pts",
        min: 0,
        tooltip: "Alerta quando o dia passa da meta/stop do robô por mais que isso, ou termina longe dos dois",
      },
    ],
  },
  {
    key: "projecao",
    title: "Projeção do mês",
    description: "Contratos operados hoje e quanto um dia de meta e um dia de stop costumam fechar de fato.",
    fields: [
      { name: "contracts", label: "Contratos operados", suffix: "contr." },
      { name: "projectedGainDay", label: "Resultado do dia de meta", suffix: "pts", tooltip: "Ex.: 3 ganhos de 100 = 300" },
      { name: "projectedLossDay", label: "Resultado do dia de stop", suffix: "pts", tooltip: "Ex.: 2 stops de 150 = 300" },
      { name: "avgTradesPerDay", label: "Trades médios por dia", suffix: "trades", tooltip: "Usado para estimar taxas B3" },
    ],
  },
  {
    key: "banca",
    title: "Gestão de banca",
    description:
      "Contratos recomendados = o menor entre o limite de risco (stop global + taxas ≤ % da banca) e a margem da corretora.",
    fields: [
      { name: "initialBankroll", label: "Banca inicial do ativo", prefix: "R$", min: 0, step: 100 },
      {
        name: "marginPerContract",
        label: "Margem por contrato",
        prefix: "R$",
        min: 0,
        step: 5,
        tooltip: "Garantia exigida pela corretora por contrato. 0 = sem teto pela margem",
      },
      {
        name: "riskPercent",
        label: "Risco máximo por dia de stop",
        suffix: "% da banca",
        min: 0.5,
        step: 0.5,
        tooltip: "Quanto da banca um dia de stop (stop global + taxas) pode consumir. Ex.: 10% de R$ 1.000 = R$ 100",
      },
      {
        name: "drawdownLimit",
        label: "Proteção: queda desde o pico",
        suffix: "%",
        min: 0,
        step: 5,
        tooltip:
          "Se a banca cair isso desde o maior valor, os contratos são reduzidos na mesma proporção da queda até ela voltar ao pico. 0 = desligado",
      },
      {
        name: "maxContracts",
        label: "Máximo de contratos",
        suffix: "contr.",
        min: 0,
        step: 5,
        tooltip: "Quantidade máxima que deseja chegar a operar; a recomendação e as projeções param aqui. 0 = sem limite",
      },
      {
        name: "increaseBuffer",
        label: "Folga para subir",
        suffix: "stops",
        min: 0,
        step: 1,
        tooltip:
          "Só libera um aumento quando a banca aguentar esse número de stops seguidos e ainda comportar os novos contratos. Não afeta reduções. 0 = sem folga",
      },
    ],
  },
];
