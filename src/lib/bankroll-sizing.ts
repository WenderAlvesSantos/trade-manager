import { drawdownOf, initialDrawdown, protectedContracts, stepDrawdown, type DrawdownState } from "@/lib/bankroll-drawdown";
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
  | "increaseBuffer"
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

const bufferOf = (config: SizingConfig) => Math.max(config.increaseBuffer ?? 0, 0);

// Banca para subir até `contracts`: a mínima para operá-los + a folga de N dias de stop com eles.
export function bankrollToReach(config: SizingConfig, contracts: number) {
  return roundToCents(bankrollForContracts(config, contracts) + bufferOf(config) * stopDayCost(config, contracts));
}

// Contratos para o próximo pregão partindo de `current`: reduções valem na hora; aumentos só até onde a banca
// tem a folga configurada (aguenta N stops seguidos e ainda comporta os novos contratos).
export function nextContracts(config: SizingConfig, bankroll: number, drawdown: DrawdownState, current: number) {
  const { recommended } = contractsForBankroll(config, bankroll, drawdown);
  if (bufferOf(config) === 0 || recommended <= current) return recommended;
  const perContract = Math.max(bankrollForContracts(config, 1), config.marginPerContract) + bufferOf(config) * stopDayCost(config, 1);
  let contracts = Math.min(recommended, Math.floor(Math.max(bankroll, 0) / perContract + 1e-9));
  while (contracts > current && bankroll < bankrollToReach(config, contracts)) contracts--;
  return Math.max(contracts, current);
}

// Teto de dias simulados (a banca encolhe a cada stop, então a sequência sempre termina antes).
const MAX_STREAK_DAYS = 500;

export type StopStreak = {
  // Stops seguidos depois dos quais a recomendação ainda comporta os contratos atuais (risco, margem e proteção).
  keepingContracts: number;
  // Stops seguidos até a recomendação zerar, reduzindo os contratos a cada dia como o sistema recomendaria.
  untilOut: number;
};

export function stopStreak(config: SizingConfig, bankroll: number, drawdown: DrawdownState = initialDrawdown(bankroll)): StopStreak {
  let state = drawdown;
  let remaining = bankroll;
  let contracts = config.contracts;
  let keepingContracts = 0;
  let untilOut = 0;
  let keeping = true;

  while (contracts > 0 && untilOut < MAX_STREAK_DAYS) {
    remaining = roundToCents(remaining - stopDayCost(config, contracts));
    state = stepDrawdown(state, remaining, config.drawdownLimit);
    untilOut++;
    contracts = remaining > 0 ? contractsForBankroll(config, remaining, state).recommended : 0;
    keeping = keeping && contracts >= config.contracts;
    if (keeping) keepingContracts++;
  }
  return { keepingContracts, untilOut };
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
  // Dias de stop seguidos mantendo os contratos atuais e até não poder operar.
  stopStreak: StopStreak;
  // Banca a mais necessária para cada contrato adicional.
  bankrollPerContract: number;
  // Próximo nível e a banca para subir até ele (com a folga configurada).
  nextContracts: number;
  requiredForNext: number;
  // A banca já comporta mais contratos, mas a folga para subir ainda segura o aumento.
  heldByBuffer: boolean;
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
  const next = config.contracts + 1;
  const requiredForNext = bankrollToReach(config, next);
  const buffered = nextContracts(config, bankroll, drawdown, config.contracts);
  const suggestedContracts = Math.max(buffered, 1);

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
    stopStreak: stopStreak(config, bankroll, drawdown),
    bankrollPerContract: bankrollForContracts(config, 1),
    nextContracts: next,
    requiredForNext,
    heldByBuffer: recommended > config.contracts && buffered < recommended,
    progressToNext: requiredForNext > 0 ? Math.min(Math.max(bankroll / requiredForNext, 0), 1) : 0,
    peak: drawdown.peak,
    drawdown: drawdownOf(drawdown.peak, bankroll),
    protecting: drawdown.protecting,
    unprotected,
    atMax: config.maxContracts > 0 && config.contracts >= config.maxContracts,
  };
}

export type BankrollLevel = { contracts: number; requiredBankroll: number; stopCost: number; missing: number };

// Banca para cada quantidade de contratos e quanto falta; acima dos contratos atuais inclui a folga para subir.
export function bankrollLevel(config: SizingConfig, bankroll: number, contracts: number): BankrollLevel {
  const requiredBankroll =
    contracts > config.contracts ? bankrollToReach(config, contracts) : bankrollForContracts(config, contracts);
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
