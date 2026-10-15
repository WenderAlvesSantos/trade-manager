"use client";

import { Segmented } from "antd";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { parseStopsMode, type StopsMode } from "@/lib/stops-mode";
import { useStoredState } from "../shared/use-stored-state";

const DEFAULT_STOPS: StopsMode = "together";

const OPTIONS: { value: StopsMode; label: string }[] = [
  { value: "together", label: "Stops juntos (pior caso)" },
  { value: "alternate", label: "Alternados (como em Trades)" },
];

export const STOPS_MODE_TEXT: Record<StopsMode, string> = {
  together: "Stops juntos: cada dia de stop pega todos os ativos (pior caso).",
  alternate: "Stops alternados: cada ativo tem os stops do cenário em pregões diferentes.",
};

// Uma escolha por conta, compartilhada entre a escada do mês e os meses futuros e lembrada no navegador.
export function useStopsMode(data: RiskDashboardData) {
  return useStoredState(`megan:stops-mode:${data.account}`, DEFAULT_STOPS, parseStopsMode);
}

export function StopsModeSelect({ value, onChange }: { value: StopsMode; onChange: (next: StopsMode) => void }) {
  return <Segmented size="small" value={value} onChange={onChange} options={OPTIONS} />;
}
