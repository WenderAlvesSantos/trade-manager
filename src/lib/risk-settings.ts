import type { AccountType, Asset } from "@/generated/prisma/enums";
import { monthRange } from "@/lib/b3-calendar";
import { prisma } from "@/lib/prisma";
import { ASSETS, type RiskConfig } from "@/lib/risk-projection";

// Campos editáveis (sem ativo e datas). `active` indica se o ativo é operado na conta.
export type RiskValues = Omit<RiskConfig, "asset" | "levelStartDate" | "bankrollStartDate"> & { active: boolean };

// Valores usados enquanto conta + ativo não tiverem configuração salva. Banca 0 = ainda não configurada.
export const DEFAULT_RISK_VALUES: Record<Asset, RiskValues> = {
  WIN: {
    active: true,
    contracts: 1,
    dailyGainTarget: 250,
    dailyStopLimit: 250,
    tradeTarget: 100,
    tradeStop: 150,
    projectedGainDay: 300,
    projectedLossDay: 300,
    avgTradesPerDay: 3,
    deviationTolerance: 50,
    initialBankroll: 0,
    marginPerContract: 155,
    riskPercent: 10,
    drawdownLimit: 20,
    maxContracts: 0,
    increaseBuffer: 0,
  },
  WDO: {
    active: false,
    contracts: 1,
    dailyGainTarget: 10,
    dailyStopLimit: 10,
    tradeTarget: 4,
    tradeStop: 6,
    projectedGainDay: 12,
    projectedLossDay: 12,
    avgTradesPerDay: 3,
    deviationTolerance: 3,
    initialBankroll: 0,
    marginPerContract: 0,
    riskPercent: 10,
    drawdownLimit: 20,
    maxContracts: 0,
    increaseBuffer: 0,
  },
};

export type AccountRiskConfig = RiskConfig & { active: boolean; saved: boolean };
export type AssetConfigs = Record<Asset, AccountRiskConfig>;

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

// Só os campos editáveis da configuração (sem ids, ativo, datas ou flags).
export function riskValues(source: RiskValues): RiskValues {
  return {
    active: source.active,
    contracts: source.contracts,
    dailyGainTarget: source.dailyGainTarget,
    dailyStopLimit: source.dailyStopLimit,
    tradeTarget: source.tradeTarget,
    tradeStop: source.tradeStop,
    projectedGainDay: source.projectedGainDay,
    projectedLossDay: source.projectedLossDay,
    avgTradesPerDay: source.avgTradesPerDay,
    deviationTolerance: source.deviationTolerance,
    initialBankroll: source.initialBankroll,
    marginPerContract: source.marginPerContract,
    riskPercent: source.riskPercent,
    drawdownLimit: source.drawdownLimit,
    maxContracts: source.maxContracts,
    increaseBuffer: source.increaseBuffer,
  };
}

// Sempre escopado ao userId da sessão. Sem registro, usa os defaults do ativo com datas no início do mês corrente.
export async function getAccountRiskConfigs(userId: string, account: AccountType, today: string): Promise<AssetConfigs> {
  const rows = await prisma.riskSettings.findMany({ where: { userId, accountType: account } });
  const monthStart = monthRange(today).from;

  const build = (asset: Asset): AccountRiskConfig => {
    const row = rows.find((item) => item.asset === asset);
    if (!row) {
      return { ...DEFAULT_RISK_VALUES[asset], asset, levelStartDate: monthStart, bankrollStartDate: monthStart, saved: false };
    }
    return {
      ...riskValues(row),
      asset,
      levelStartDate: dayKey(row.levelStartDate),
      bankrollStartDate: dayKey(row.bankrollStartDate),
      saved: true,
    };
  };
  return { WIN: build("WIN"), WDO: build("WDO") };
}

export async function getRiskConfig(userId: string, account: AccountType, asset: Asset, today: string) {
  return (await getAccountRiskConfigs(userId, account, today))[asset];
}

// Ativos operados na conta. Sem nada salvo, assume WIN (comportamento padrão).
// `only` restringe ao ativo do filtro (ex.: ?ativo=WDO).
export function activeConfigs(configs: AssetConfigs, only?: Asset): AccountRiskConfig[] {
  const saved = ASSETS.map((asset) => configs[asset]).filter((config) => config.saved);
  const active = saved.length === 0 ? [configs.WIN] : saved.filter((config) => config.active);
  return only ? active.filter((config) => config.asset === only) : active;
}

export async function getAllRiskConfigs(userId: string, today: string): Promise<Record<AccountType, AssetConfigs>> {
  const [SIMULADOR, REAL] = await Promise.all([
    getAccountRiskConfigs(userId, "SIMULADOR", today),
    getAccountRiskConfigs(userId, "REAL", today),
  ]);
  return { SIMULADOR, REAL };
}
