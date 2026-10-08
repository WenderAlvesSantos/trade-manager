"use client";

import { Alert } from "antd";
import { bankrollHistory } from "@/lib/bankroll-drawdown";
import { bankrollStatus } from "@/lib/bankroll-sizing";
import { formatCurrency, formatPercent } from "@/lib/format";
import { exceedsLiquidity, LIQUID_CONTRACTS, type RiskConfig } from "@/lib/risk-projection";
import { COLORS } from "@/lib/theme";
import type { EquityPoint } from "@/lib/trade-aggregations";
import { PreviewRow } from "./preview-row";

// Dimensionamento pela banca com os valores do formulário, sobre o líquido real desde o início salvo.
export function BankrollPreview({ config, bankrollCurve }: { config: RiskConfig; bankrollCurve: EquityPoint[] }) {
  if (!(config.initialBankroll > 0)) {
    return <Alert type="info" showIcon title="Informe a banca inicial para calcular os contratos recomendados." />;
  }

  const history = bankrollHistory(config.initialBankroll, config.bankrollStartDate, bankrollCurve, config.drawdownLimit);
  const status = bankrollStatus(config, history.bankroll, history.drawdown);
  const overRisk = status.currentRiskShare > config.riskPercent / 100;

  return (
    <>
      <PreviewRow label="Banca atual" value={formatCurrency(status.bankroll)} />
      <PreviewRow label="Pico / queda" value={`${formatCurrency(status.peak)} / ${formatPercent(status.drawdown)}`} />
      <PreviewRow
        label="Contratos pelo risco / pela margem"
        value={`${status.byRisk} / ${status.byMargin ?? "sem teto"}`}
      />
      <PreviewRow
        label={status.protecting ? "Recomendado (em proteção)" : "Recomendado"}
        value={`${status.recommended} contr.`}
        color={status.recommended === 0 || status.protecting ? COLORS.loss : COLORS.profit}
      />
      <PreviewRow
        label={`Dia de stop com ${config.contracts} contr.`}
        value={`${formatCurrency(status.currentStopCost)} (${formatPercent(status.currentRiskShare)})`}
        color={overRisk ? COLORS.loss : undefined}
      />
      <PreviewRow label="Stops seguidos até zerar" value={`${status.stopDaysToRuin}`} />
      <PreviewRow label="Banca por contrato" value={formatCurrency(status.bankrollPerContract)} />
      {status.recommended === 0 && !status.protecting && (
        <Alert
          className="mt-2"
          type="error"
          showIcon
          title={`A banca não comporta 1 contrato com risco de ${config.riskPercent}%: mínimo de ${formatCurrency(status.bankrollPerContract)}.`}
        />
      )}
      {exceedsLiquidity(config) && (
        <Alert
          className="mt-2"
          type="warning"
          showIcon
          title={`Máximo de ${config.maxContracts} contratos passa da liquidez razoável do ${config.asset} (~${LIQUID_CONTRACTS[config.asset]}): espere slippage nas ordens a mercado.`}
        />
      )}
    </>
  );
}
