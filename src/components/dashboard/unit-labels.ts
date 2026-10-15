import { formatCurrency } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";

type UnitData = Pick<RiskDashboardData, "configs" | "label">;

export const isCombined = (data: UnitData) => data.configs.length > 1;

// "4 contr. WIN" ou, com banca única para vários ativos, "4 contr. em cada ativo (WIN + WDO)".
export const contractsLabel = (data: UnitData, contracts: number) =>
  isCombined(data) ? `${contracts} contr. em cada ativo (${data.label})` : `${contracts} contr. ${data.label}`;

// Stop global de cada ativo, em pontos do próprio ativo.
export const stopLimitsLabel = (data: UnitData) =>
  data.configs.map((config) => `${config.dailyStopLimit} pts ${config.asset}`).join(" + ");

export const marginLabel = (data: UnitData) =>
  data.configs
    .map((config) => {
      const margin = config.marginPerContract > 0 ? `${formatCurrency(config.marginPerContract)} por contrato` : "sem teto";
      return isCombined(data) ? `${config.asset} ${margin}` : margin;
    })
    .join(", ");

export const toleranceLabel = (data: UnitData) =>
  data.configs.map((config) => `${config.deviationTolerance} pts ${config.asset}`).join(", ");
