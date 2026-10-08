import type { AccountType, Asset } from "@/generated/prisma/enums";
import type { BankrollStatus } from "@/lib/bankroll-sizing";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { ACCOUNT_LABEL } from "@/lib/trade-filters";

// Aviso exibido no app e enviado por push. `key` é estável: cada aviso sai uma única vez.
export type AppAlert = {
  key: string;
  severity: "error" | "warning" | "success";
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

type BankrollContext = { account: AccountType; asset: Asset; contracts: number };

// Avisa quando a banca comporta outro número de contratos; um aviso por (contratos atuais → sugeridos).
export function bankrollAlert(context: BankrollContext, status: BankrollStatus): AppAlert | null {
  if (status.suggestion === "manter") return null;
  const { account, asset, contracts } = context;
  const label = `${ACCOUNT_LABEL[account]} · ${asset}`;
  const base = {
    key: `bankroll:${account}:${asset}:${contracts}:${status.suggestedContracts}`,
    url: `/?conta=${account}`,
  };

  if (status.suggestion === "subir") {
    return {
      ...base,
      severity: "success",
      title: `Banca: pode subir para ${status.suggestedContracts} contratos (${asset})`,
      body: `${label}: banca de ${formatCurrency(status.bankroll)} comporta ${status.suggestedContracts} contratos no risco configurado (hoje: ${contracts}).`,
    };
  }
  return {
    ...base,
    severity: "warning",
    title: `Banca: reduza para ${status.suggestedContracts} contrato(s) (${asset})`,
    body: status.protecting
      ? `${label}: banca de ${formatCurrency(status.bankroll)} caiu ${formatPercent(status.drawdown)} do pico de ${formatCurrency(status.peak)}. Proteção ativa até voltar ao pico.`
      : `${label}: com banca de ${formatCurrency(status.bankroll)}, ${contracts} contratos arriscam mais que o limite por dia de stop.`,
  };
}
