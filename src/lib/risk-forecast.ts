import { businessDaysOfMonth } from "@/lib/b3-calendar";
import { initialDrawdown, stepDrawdown, type DrawdownState } from "@/lib/bankroll-drawdown";
import { contractsForBankroll, nextContracts } from "@/lib/bankroll-sizing";
import { projectMonth, type RiskConfig } from "@/lib/risk-projection";
import { alternatePeriodNet, isAlternate, type StopsMode } from "@/lib/stops-mode";
import { roundToCents } from "@/lib/trade-calculations";

export type ForecastMonth = {
  year: number;
  month: number;
  businessDays: number;
  contracts: number;
  net: number;
  // Banca no fim do mês, com contratos dimensionados pela banca e com os contratos fixos atuais.
  bankroll: number;
  fixedBankroll: number;
  // Contratos recomendados para o mês seguinte quando mudam (null = mantém).
  nextContracts: number | null;
};

// Dias de stop fixos por mês ou um líquido diário médio por contrato (cenário "média real").
export type ForecastScenario = { lossDays: number } | { dailyNetPerContract: number };

type ForecastOptions = {
  startYear: number;
  startMonth: number;
  months: number;
  scenario: ForecastScenario;
  // Banca projetada no início do primeiro mês (atual + o que falta do mês corrente).
  initialBankroll: number;
  // Pico e proteção de queda atuais; sem eles, o pico parte da banca inicial.
  drawdown?: DrawdownState;
  // Ativos que dividem a banca e como os stops caem entre eles (ver monthLadder).
  assets?: RiskConfig[];
  stops?: StopsMode;
};

const nextMonth = (year: number, month: number) => (month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 });

function monthNet(config: RiskConfig, contracts: number, businessDays: number, options: ForecastOptions) {
  const { scenario } = options;
  if (contracts <= 0) return 0;
  if ("lossDays" in scenario) {
    if (isAlternate(options.stops, options.assets)) {
      return alternatePeriodNet(options.assets, contracts, businessDays, scenario.lossDays);
    }
    return projectMonth({ ...config, contracts }, [], businessDays, scenario.lossDays).total;
  }
  return roundToCents(scenario.dailyNetPerContract * contracts * businessDays);
}

// Projeta meses cheios redimensionando os contratos pela banca a cada mês; compara com manter os contratos atuais.
// Banca insuficiente para 1 contrato no risco configurado = mês sem operar. A proteção de queda vale mês a mês.
export function forecastMonths(config: RiskConfig, options: ForecastOptions): ForecastMonth[] {
  let { startYear: year, startMonth: month } = options;
  let bankroll = options.initialBankroll;
  let fixedBankroll = options.initialBankroll;
  let drawdown = stepDrawdown(options.drawdown ?? initialDrawdown(bankroll), bankroll, config.drawdownLimit);
  let contracts = contractsForBankroll(config, bankroll, drawdown).recommended;
  const result: ForecastMonth[] = [];

  for (let index = 0; index < options.months; index++) {
    const businessDays = businessDaysOfMonth(year, month).length;
    const net = monthNet(config, contracts, businessDays, options);
    bankroll = roundToCents(bankroll + net);
    fixedBankroll = roundToCents(fixedBankroll + monthNet(config, config.contracts, businessDays, options));

    drawdown = stepDrawdown(drawdown, bankroll, config.drawdownLimit);
    const recommended = nextContracts(config, bankroll, drawdown, contracts);
    result.push({
      year,
      month,
      businessDays,
      contracts,
      net,
      bankroll,
      fixedBankroll,
      nextContracts: recommended !== contracts ? recommended : null,
    });
    contracts = recommended;
    ({ year, month } = nextMonth(year, month));
  }
  return result;
}
