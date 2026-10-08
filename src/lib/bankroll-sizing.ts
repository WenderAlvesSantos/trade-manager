import { drawdownOf, initialDrawdown, protectedContracts, type DrawdownState } from "@/lib/bankroll-drawdown";
import type { RiskConfig } from "@/lib/risk-projection";
import { FEE_PER_CONTRACT, POINT_VALUE, roundToCents } from "@/lib/trade-calculations";

export type SizingConfig = Pick<
  RiskConfig,
  | "asset"
  | "dailyStopLimit"
  | "avgTradesPerDay"
  | "contracts"
  | "marginPerContract"
  | "riskPercent"
  | "initialBankroll"
  | "drawdownLimit"
  | "maxContracts"
>;

// Teto configurado pelo usuário (0 = sem limite).
export const capContracts = (config: Pick<SizingConfig, "maxContracts">, contracts: number) =>
  config.maxContracts > 0 ? Math.min(contracts, config.maxContracts) : contracts;

export type BankrollSuggestion = "subir" | "manter" | "rebaixar";

// Perda de um dia em que o robô bate o stop global, com as taxas B3 estimadas (prejuízo não tem IRRF).
export function stopDayCost(config: SizingConfig, contracts: number) {
  const perContract = config.dailyStopLimit * POINT_VALUE[config.asset] + config.avgTradesPerDay * FEE_PER_CONTRACT[config.asset];
  return roundToCents(perContract * contracts);
}

// Banca mínima para operar `contracts`: o dia de stop não pode passar de `riskPercent` da banca
// e a banca precisa cobrir a margem da corretora (margem 0 = sem teto).
export function bankrollForContracts(config: SizingConfig, contracts: number) {
  const byRisk = config.riskPercent > 0 ? stopDayCost(config, contracts) / (config.riskPercent / 100) : Infinity;
  const byMargin = contracts * Math.max(config.marginPerContract, 0);
  return roundToCents(Math.max(byRisk, byMargin));
}

// Contratos permitidos por cada limite, o menor deles com o teto configurado (`unprotected`)
// e o recomendado após a proteção de queda.
export function contractsForBankroll(config: SizingConfig, bankroll: number, drawdown: DrawdownState = initialDrawdown(bankroll)) {
  const available = Math.max(bankroll, 0);
  const stopCost = stopDayCost(config, 1);
  const byRisk = stopCost > 0 ? Math.floor((available * config.riskPercent) / 100 / stopCost + 1e-9) : 0;
  const byMargin = config.marginPerContract > 0 ? Math.floor(available / config.marginPerContract + 1e-9) : null;
  const unprotected = capContracts(config, byMargin === null ? byRisk : Math.min(byRisk, byMargin));
  return { byRisk, byMargin, unprotected, recommended: protectedContracts(unprotected, bankroll, drawdown) };
}

export type BankrollStatus = {
  configured: boolean;
  bankroll: number;
  byRisk: number;
  byMargin: number | null;
  recommended: number;
  suggestion: BankrollSuggestion;
  // Contratos sugeridos ao aplicar (nunca abaixo de 1).
  suggestedContracts: number;
  stopCostPerContract: number;
  // Perda de um dia de stop com os contratos atuais, em R$ e em fração da banca.
  currentStopCost: number;
  currentRiskShare: number;
  // Dias de stop seguidos que a banca aguenta com os contratos atuais.
  stopDaysToRuin: number;
  // Banca a mais necessária para cada contrato adicional.
  bankrollPerContract: number;
  nextContracts: number;
  requiredForNext: number;
  progressToNext: number;
  // Proteção de queda: pico, queda atual (fração), se está ativa e contratos sem ela.
  peak: number;
  drawdown: number;
  protecting: boolean;
  unprotected: number;
  // Já opera o máximo de contratos configurado (não há próximo nível).
  atMax: boolean;
};

export function bankrollStatus(config: SizingConfig, bankroll: number, drawdown: DrawdownState = initialDrawdown(bankroll)): BankrollStatus {
  const configured = config.initialBankroll > 0;
  const { byRisk, byMargin, unprotected, recommended } = contractsForBankroll(config, bankroll, drawdown);
  const stopCostPerContract = stopDayCost(config, 1);
  const currentStopCost = stopDayCost(config, config.contracts);
  const nextContracts = config.contracts + 1;
  const requiredForNext = bankrollForContracts(config, nextContracts);
  const suggestedContracts = Math.max(recommended, 1);

  let suggestion: BankrollSuggestion = "manter";
  if (configured && suggestedContracts > config.contracts) suggestion = "subir";
  else if (configured && suggestedContracts < config.contracts) suggestion = "rebaixar";

  return {
    configured,
    bankroll: roundToCents(bankroll),
    byRisk,
    byMargin,
    recommended,
    suggestion,
    suggestedContracts,
    stopCostPerContract,
    currentStopCost,
    currentRiskShare: bankroll > 0 ? currentStopCost / bankroll : 1,
    stopDaysToRuin: currentStopCost > 0 ? Math.max(Math.floor(bankroll / currentStopCost), 0) : 0,
    bankrollPerContract: bankrollForContracts(config, 1),
    nextContracts,
    requiredForNext,
    progressToNext: requiredForNext > 0 ? Math.min(Math.max(bankroll / requiredForNext, 0), 1) : 0,
    peak: drawdown.peak,
    drawdown: drawdownOf(drawdown.peak, bankroll),
    protecting: drawdown.protecting,
    unprotected,
    atMax: config.maxContracts > 0 && config.contracts >= config.maxContracts,
  };
}

export type BankrollLevel = { contracts: number; requiredBankroll: number; stopCost: number; missing: number };

// Banca para cada quantidade de contratos e quanto falta.
export function bankrollLevel(config: SizingConfig, bankroll: number, contracts: number): BankrollLevel {
  const requiredBankroll = bankrollForContracts(config, contracts);
  return {
    contracts,
    requiredBankroll,
    stopCost: stopDayCost(config, contracts),
    missing: roundToCents(Math.max(requiredBankroll - bankroll, 0)),
  };
}

// Patamares de banca de 1 contrato até o recomendado/atual + `ahead` níveis (sem passar do máximo configurado).
export function bankrollLevels(config: SizingConfig, bankroll: number, ahead = 4): BankrollLevel[] {
  const { unprotected } = contractsForBankroll(config, bankroll);
  const last = capContracts(config, Math.max(unprotected, config.contracts, 1) + ahead);
  return Array.from({ length: Math.max(last, 1) }, (_, index) => bankrollLevel(config, bankroll, index + 1));
}
