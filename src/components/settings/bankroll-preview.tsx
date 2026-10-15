"use client";

import { Alert } from "antd";
import { bankrollHistory } from "@/lib/bankroll-drawdown";
import { bankrollStatus } from "@/lib/bankroll-sizing";
import { combinedConfig } from "@/lib/combined-sizing";
import { formatCurrency, formatPercent } from "@/lib/format";
import { exceedsLiquidity, LIQUID_CONTRACTS, type RiskConfig } from "@/lib/risk-projection";
import { COLORS } from "@/lib/theme";
import type { EquityPoint } from "@/lib/trade-aggregations";
import { PreviewRow } from "./preview-row";

type BankrollPreviewProps = { configs: RiskConfig[]; bankrollCurve: EquityPoint[] };

// Dimensionamento pela banca com os valores do formulário, sobre o líquido real desde o início salvo.
// Com vários ativos operados, é a banca única da conta (mesmo cálculo do Dashboard).
export function BankrollPreview({ configs, bankrollCurve }: BankrollPreviewProps) {
  const config = combinedConfig(configs);
  const combined = configs.length > 1;
  if (!(config.initialBankroll > 0)) {
    return <Alert type="info" showIcon title="Informe a banca inicial para calcular os contratos recomendados." />;
  }

  const history = bankrollHistory(config.initialBankroll, config.bankrollStartDate, bankrollCurve, config.drawdownLimit);
  const status = bankrollStatus(config, history.bankroll, history.drawdown);
  const overRisk = status.currentRiskShare > config.riskPercent / 100;
  const each = combined ? " em cada ativo" : "";
  const illiquid = configs.filter(exceedsLiquidity);

  return (
    <>
      <PreviewRow label="Banca atual" value={formatCurrency(status.bankroll)} />
      <PreviewRow label="Pico / queda" value={`${formatCurrency(status.peak)} / ${formatPercent(status.drawdown)}`} />
      {combined ? (
        <PreviewRow label="Contratos pela banca" value={`${status.byRisk}`} />
      ) : (
        <PreviewRow label="Contratos pelo risco / pela margem" value={`${status.byRisk} / ${status.byMargin ?? "sem teto"}`} />
      )}
      <PreviewRow
        label={status.protecting ? `Recomendado${each} (em proteção)` : `Recomendado${each}`}
        value={`${status.recommended} contr.`}
        color={status.recommended === 0 || status.protecting ? COLORS.loss : COLORS.profit}
      />
      <PreviewRow
        label={`Dia de stop com ${config.contracts} contr.${each}`}
        value={`${formatCurrency(status.currentStopCost)} (${formatPercent(status.currentRiskShare)})`}
        color={overRisk ? COLORS.loss : undefined}
      />
      <PreviewRow
        label={`Stops seguidos mantendo ${config.contracts} contr.`}
        value={`${status.stopStreak.keepingContracts}`}
        color={status.stopStreak.keepingContracts === 0 ? COLORS.loss : undefined}
      />
      <PreviewRow label="Stops seguidos até parar (reduzindo)" value={`${status.stopStreak.untilOut}`} />
      <PreviewRow label={combined ? "Banca por contrato (todos os ativos)" : "Banca por contrato"} value={formatCurrency(status.bankrollPerContract)} />
      {combined && (
        <p className="mt-1 text-xs text-white/45">
          Proteção de {config.drawdownLimit > 0 ? `${config.drawdownLimit}%` : "desligada"} e máximo de{" "}
          {config.maxContracts > 0 ? config.maxContracts : "sem limite"}: os mais restritivos entre os ativos.
        </p>
      )}
      {status.recommended === 0 && !status.protecting && (
        <Alert
          className="mt-2"
          type="error"
          showIcon
          title={`A banca não comporta 1 contrato${each} com risco de ${config.riskPercent}%: mínimo de ${formatCurrency(status.bankrollPerContract)}.`}
        />
      )}
      {illiquid.map((item) => (
        <Alert
          key={item.asset}
          className="mt-2"
          type="warning"
          showIcon
          title={`Máximo de ${item.maxContracts} contratos passa da liquidez razoável do ${item.asset} (~${LIQUID_CONTRACTS[item.asset]}): espere slippage nas ordens a mercado.`}
        />
      ))}
    </>
  );
}
