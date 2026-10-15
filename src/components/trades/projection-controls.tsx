"use client";

import { Segmented, Select } from "antd";
import { useStoredState } from "@/components/shared/use-stored-state";
import { DEFAULT_STOP_EVERY, HORIZON_CHOICES, STOP_EVERY_CHOICES, type ProjectedDay } from "@/lib/daily-projection";
import { formatCurrency } from "@/lib/format";
import { resultHex } from "@/lib/theme";
import type { ProjectionInput } from "@/lib/trades-overlay";

export type ProjectionSettings = { months: number; stopEvery: number };

const FALLBACK: ProjectionSettings = { months: 1, stopEvery: DEFAULT_STOP_EVERY };

const parseSettings = (raw: unknown): ProjectionSettings | null => {
  const value = raw as Partial<ProjectionSettings> | null;
  const months = HORIZON_CHOICES.find((choice) => choice === value?.months);
  const stopEvery = STOP_EVERY_CHOICES.find((choice) => choice === value?.stopEvery);
  return months && stopEvery ? { months, stopEvery } : null;
};

export const useProjectionSettings = () => useStoredState("megan:trades-projection", FALLBACK, parseSettings);

type ControlsProps = { settings: ProjectionSettings; onChange: (next: ProjectionSettings) => void };

export function ProjectionControls({ settings, onChange }: ControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-white/65">
      <span>Projeção:</span>
      <Segmented
        size="small"
        value={settings.months}
        onChange={(months) => onChange({ ...settings, months: Number(months) })}
        options={HORIZON_CHOICES.map((months) => ({ value: months, label: `${months} ${months === 1 ? "mês" : "meses"}` }))}
      />
      <Select
        size="small"
        value={settings.stopEvery}
        onChange={(stopEvery) => onChange({ ...settings, stopEvery })}
        options={STOP_EVERY_CHOICES.map((every) => ({ value: every, label: `1 stop a cada ${every} pregões` }))}
        popupMatchSelectWidth={false}
      />
    </div>
  );
}

type SummaryProps = { input: ProjectionInput; days: ProjectedDay[] };

// Cabeçalho como o da planilha: banca inicial, lucro total, saldo atual e previsto (banca combinada).
export function ProjectionSummary({ input, days }: SummaryProps) {
  const initial = input.configs.reduce((total, config) => total + config.initialBankroll, 0);
  const profit = input.bankroll - initial;
  const last = days.at(-1);
  const items = [
    { label: "Banca inicial", value: formatCurrency(initial) },
    { label: "Lucro total", value: formatCurrency(profit), color: resultHex(profit) },
    { label: "Saldo atual", value: formatCurrency(input.bankroll) },
    { label: "Saldo previsto", value: last ? formatCurrency(last.bankroll) : "—" },
    { label: "Contratos ao final", value: last ? String(last.nextContracts) : "—" },
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 pt-3 text-xs">
      {items.map((item) => (
        <span key={item.label} className="flex flex-col">
          <span className="text-white/45">{item.label}</span>
          <span className="text-sm font-medium" style={{ color: item.color }}>
            {item.value}
          </span>
        </span>
      ))}
      <span className="self-end text-white/45">
        {input.configs.map((config) => config.asset).join(" + ")} com a mesma quantidade de contratos e banca única.
      </span>
    </div>
  );
}
