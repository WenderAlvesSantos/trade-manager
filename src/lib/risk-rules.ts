import type { AccountType, Asset } from "@/generated/prisma/enums";
import { ruleResolver, type DatedRule, type RiskRule, type RuleResolver } from "@/lib/day-deviation";
import { prisma } from "@/lib/prisma";
import { RULE_BASELINE_DATE } from "@/lib/rule-baseline";

const RULE_FIELDS = [
  "dailyGainTarget",
  "dailyStopLimit",
  "deviationTolerance",
  "riskPercent",
  "marginPerContract",
  "drawdownLimit",
  "maxContracts",
] as const;

export const pickRule = (source: RiskRule): RiskRule => ({
  asset: source.asset,
  dailyGainTarget: source.dailyGainTarget,
  dailyStopLimit: source.dailyStopLimit,
  deviationTolerance: source.deviationTolerance,
  riskPercent: source.riskPercent,
  marginPerContract: source.marginPerContract,
  drawdownLimit: source.drawdownLimit,
  maxContracts: source.maxContracts,
});

export const ruleChanged = (previous: RiskRule, next: RiskRule) =>
  RULE_FIELDS.some((field) => previous[field] !== next[field]);

export async function getRuleHistory(userId: string, account: AccountType, asset: Asset): Promise<DatedRule[]> {
  const rows = await prisma.riskRuleVersion.findMany({
    where: { userId, accountType: account, asset },
    orderBy: { effectiveFrom: "asc" },
  });
  return rows.map((row) => ({ ...pickRule(row), effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10) }));
}

export async function getRuleResolver(userId: string, account: AccountType, current: RiskRule): Promise<RuleResolver> {
  return ruleResolver(pickRule(current), await getRuleHistory(userId, account, current.asset));
}

const upsertVersion = (userId: string, account: AccountType, effectiveFrom: string, rule: RiskRule) => {
  const key = { userId, accountType: account, asset: rule.asset, effectiveFrom: new Date(effectiveFrom) };
  return prisma.riskRuleVersion.upsert({
    where: { userId_accountType_asset_effectiveFrom: key },
    create: { ...key, ...pickRule(rule) },
    update: pickRule(rule),
  });
};

// Desfaz a versão de regra criada hoje: apaga-a e volta a configuração para a versão anterior (mesma transação).
// Devolve a regra restaurada ou null se não houver mudança hoje (ou nada anterior a ela).
export async function revertTodayRule(userId: string, account: AccountType, asset: Asset, today: string) {
  const history = await getRuleHistory(userId, account, asset);
  const previous = history.filter((rule) => rule.effectiveFrom < today).at(-1);
  if (!previous || !history.some((rule) => rule.effectiveFrom === today)) return null;

  const fields = Object.fromEntries(RULE_FIELDS.map((field) => [field, previous[field]]));
  await prisma.$transaction([
    prisma.riskRuleVersion.delete({
      where: { userId_accountType_asset_effectiveFrom: { userId, accountType: account, asset, effectiveFrom: new Date(today) } },
    }),
    prisma.riskSettings.update({ where: { userId_accountType_asset: { userId, accountType: account, asset } }, data: fields }),
  ]);
  return previous;
}

// Escritas para a transação de salvar configurações: preserva a regra anterior como base (se ainda não houver
// histórico do ativo) e registra a nova a partir de hoje. Várias mudanças no mesmo dia ficam numa única versão.
export async function ruleVersionWrites(
  userId: string,
  account: AccountType,
  previous: RiskRule,
  next: RiskRule,
  today: string,
) {
  if (!ruleChanged(previous, next)) return [];
  const hasHistory = (await prisma.riskRuleVersion.count({ where: { userId, accountType: account, asset: next.asset } })) > 0;
  return [
    ...(hasHistory ? [] : [upsertVersion(userId, account, RULE_BASELINE_DATE, previous)]),
    upsertVersion(userId, account, today, next),
  ];
}
