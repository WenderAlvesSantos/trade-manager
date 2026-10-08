"use client";

import { useMemo, useState, useTransition } from "react";
import { App, Select } from "antd";
import { adoptSizingAction } from "@/actions/risk-settings";
import { ruleResolver, type RiskRule } from "@/lib/day-deviation";
import {
  compareRiskOptions,
  DEFAULT_RISKS,
  DRAWDOWN_CHOICES,
  RISK_CHOICES,
  type ComparisonOptions,
  type RiskComparisonRow,
} from "@/lib/risk-comparison";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { useStoredState } from "@/components/shared/use-stored-state";
import { protectionLabel, RiskComparisonTable } from "./risk-comparison-table";
import { TodayRuleAlert } from "./today-rule-alert";

type Range = { min: number; max: number };

const RISK_RANGE: Range = { min: 0.5, max: 100 };
const DRAWDOWN_RANGE: Range = { min: 0, max: 99 };

// Valores digitados chegam como texto no modo "tags": aceita vírgula decimal e descarta o que sair da faixa.
function parseValues(values: unknown[], range: Range) {
  const parsed = values.map((value) => Number(String(value).replace(",", ".")));
  return [...new Set(parsed.filter((value) => Number.isFinite(value) && value >= range.min && value <= range.max))];
}

// Opções salvas no navegador: descarta formatos antigos ou inválidos.
function parseStoredOptions(raw: unknown): ComparisonOptions | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { risks, drawdowns } = raw as Record<string, unknown>;
  if (!Array.isArray(risks) || !Array.isArray(drawdowns)) return null;
  const options = { risks: parseValues(risks, RISK_RANGE), drawdowns: parseValues(drawdowns, DRAWDOWN_RANGE) };
  return options.risks.length > 0 && options.drawdowns.length > 0 ? options : null;
}

type ChoiceSelectProps = {
  label: string;
  value: number[];
  choices: number[];
  range: Range;
  format: (value: number) => string;
  onChange: (values: number[]) => void;
};

function ChoiceSelect({ label, value, choices, range, format, onChange }: ChoiceSelectProps) {
  return (
    <label className="flex min-w-60 flex-1 flex-col gap-1 text-xs text-white/45">
      {label}
      <Select
        mode="tags"
        size="small"
        value={value}
        options={choices.map((choice) => ({ value: choice, label: format(choice) }))}
        onChange={(values: (string | number)[]) => {
          const parsed = parseValues(values, range);
          if (parsed.length > 0) onChange(parsed);
        }}
        tokenSeparators={[" ", ";"]}
      />
    </label>
  );
}

function useAdopt(data: RiskDashboardData) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const onAdopt = (row: RiskComparisonRow) => {
    setPendingKey(row.key);
    startTransition(async () => {
      const sizing = { riskPercent: row.riskPercent, drawdownLimit: row.drawdownLimit };
      const result = await adoptSizingAction(data.account, data.config.asset, sizing);
      if (result?.error) message.error(result.error);
      else message.success(result?.success);
    });
  };
  return { adoptingKey: isPending ? pendingKey : null, onAdopt };
}

// Escolha de opções de risco % e de limite de queda (lembradas por conta + ativo); cada combinação refaz o período.
export function RiskComparisonPanel({ data }: { data: RiskDashboardData }) {
  const { config } = data;
  const fallback = useMemo<ComparisonOptions>(
    () => ({ risks: [...new Set([...DEFAULT_RISKS, config.riskPercent])], drawdowns: [config.drawdownLimit] }),
    [config.riskPercent, config.drawdownLimit],
  );
  const storageKey = `megan:risk-comparison:${data.account}:${config.asset}`;
  const [options, setOptions] = useStoredState(storageKey, fallback, parseStoredOptions);
  const adopt = useAdopt(data);

  const comparison = useMemo(() => {
    const ruleFor = ruleResolver<RiskRule>(config, data.ruleHistory);
    const input = { config, startDate: config.bankrollStartDate, days: data.simulationDays, ruleFor };
    return compareRiskOptions(input, options);
  }, [config, data.ruleHistory, data.simulationDays, options]);

  return (
    <div className="flex flex-col gap-3">
      <TodayRuleAlert data={data} />
      <div className="flex flex-wrap gap-4">
        <ChoiceSelect
          label="Risco por dia de stop"
          value={options.risks}
          choices={RISK_CHOICES}
          range={RISK_RANGE}
          format={(value) => `${value.toLocaleString("pt-BR")}%`}
          onChange={(risks) => setOptions({ ...options, risks })}
        />
        <ChoiceSelect
          label="Proteção: queda desde o pico"
          value={options.drawdowns}
          choices={DRAWDOWN_CHOICES}
          range={DRAWDOWN_RANGE}
          format={protectionLabel}
          onChange={(drawdowns) => setOptions({ ...options, drawdowns })}
        />
      </div>
      <RiskComparisonTable comparison={comparison} {...adopt} />
      <p className="text-xs text-white/45">
        Cada combinação fixa o risco e a proteção no período inteiro (stop e margem seguem a regra de cada época).
        &quot;Equilíbrio&quot; = maior retorno por unidade de queda máxima entre as combinações com retorno positivo;
        &quot;Adotar&quot; grava a combinação da linha como regra a partir de hoje. As opções escolhidas ficam salvas neste
        navegador.
      </p>
    </div>
  );
}
