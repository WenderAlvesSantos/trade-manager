import type { RiskConfig } from "@/lib/risk-projection";

// Configuração base dos testes (WIN, 1 contrato, stop global de 250 pts, banca de R$ 1.000, margem R$ 155, risco 10%,
// proteção ao cair 20% do pico).
export const TEST_RISK_CONFIG: RiskConfig = {
  asset: "WIN",
  contracts: 1,
  dailyGainTarget: 250,
  dailyStopLimit: 250,
  tradeTarget: 100,
  tradeStop: 150,
  projectedGainDay: 300,
  projectedLossDay: 300,
  avgTradesPerDay: 3,
  deviationTolerance: 50,
  initialBankroll: 1000,
  bankrollStartDate: "2026-10-01",
  marginPerContract: 155,
  riskPercent: 10,
  drawdownLimit: 20,
  maxContracts: 0,
  levelStartDate: "2026-10-01",
};
