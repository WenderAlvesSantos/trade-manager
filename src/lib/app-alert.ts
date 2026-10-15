import type { AccountType, Asset } from "@/generated/prisma/enums";
import type { BankrollStatus } from "@/lib/bankroll-sizing";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { ACCOUNT_LABEL } from "@/lib/trade-filters";

// Aviso exibido no app e enviado por push. `key` é estável: cada aviso sai uma única vez.
export type AppAlert = {
  key: string;
  severity: "error" | "warning" | "success" | "info";
  title: string;
  body: string;
  url: string;
};

const pts = (value: number) => `${value.toLocaleString("pt-BR")} pts`;

export function stopAlert(account: AccountType, asset: Asset, day: string, points: number, stopLimit: number): AppAlert {
  return {
    key: `stop:${account}:${asset}:${day}`,
    severity: "error",
    title: `Stop global excedido (${asset})`,
    body: `${ACCOUNT_LABEL[account]} · ${formatDate(day)}: ${pts(points)} (stop −${stopLimit})`,
    url: `/trades?conta=${account}`,
  };
}

// `label` = ativo ou ativos que dividem a banca ("WIN + WDO"); `asset` só quando a banca é de um único ativo.
type BankrollContext = { account: AccountType; label: string; asset?: Asset; contracts: number; increaseBuffer: number };

// Pré-aviso: mais um dia de meta já libera o próximo aumento. Um aviso por (contratos atuais → próximo nível).
export function nearIncreaseAlert(context: BankrollContext, status: BankrollStatus, gainDaysToNext: number | null): AppAlert | null {
  if (status.suggestion !== "manter" || gainDaysToNext !== 1 || status.atMax) return null;
  const { account, label, asset, contracts } = context;
  return {
    key: `bankroll-near:${account}:${label}:${contracts}:${status.nextContracts}`,
    severity: "info",
    title: `Banca: 1 dia de meta libera ${status.nextContracts} contratos (${label})`,
    body: `${ACCOUNT_LABEL[account]} · ${label}: faltam ${formatCurrency(Math.max(status.requiredForNext - status.bankroll, 0))} para a banca de ${formatCurrency(status.requiredForNext)}; um dia de meta com ${contracts} contratos cobre.`,
    url: asset ? `/?conta=${account}&ativo=${asset}` : `/?conta=${account}`,
  };
}

// Avisa quando a banca comporta outro número de contratos; um aviso por (contratos atuais → sugeridos).
export function bankrollAlert(context: BankrollContext, status: BankrollStatus): AppAlert | null {
  if (status.suggestion === "manter") return null;
  const { account, contracts } = context;
  const label = `${ACCOUNT_LABEL[account]} · ${context.label}`;
  const base = {
    key: `bankroll:${account}:${context.label}:${contracts}:${status.suggestedContracts}`,
    url: `/?conta=${account}`,
  };

  if (status.suggestion === "subir") {
    return {
      ...base,
      severity: "success",
      title: `Banca: pode subir para ${status.suggestedContracts} contratos (${context.label})`,
      body: `${label}: banca de ${formatCurrency(status.bankroll)} comporta ${status.suggestedContracts} contratos no risco configurado${context.increaseBuffer > 0 ? ` com folga de ${context.increaseBuffer} stop(s)` : ""} (hoje: ${contracts}).`,
    };
  }
  return {
    ...base,
    severity: "warning",
    title: `Banca: reduza para ${status.suggestedContracts} contrato(s) (${context.label})`,
    body: status.protecting
      ? `${label}: banca de ${formatCurrency(status.bankroll)} caiu ${formatPercent(status.drawdown)} do pico de ${formatCurrency(status.peak)}. Proteção ativa até voltar ao pico.`
      : `${label}: com banca de ${formatCurrency(status.bankroll)}, ${contracts} contratos arriscam mais que o limite por dia de stop.`,
  };
}
