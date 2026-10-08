"use client";

import { useTransition } from "react";
import Link from "next/link";
import { WalletOutlined } from "@ant-design/icons";
import { Alert, App, Button, Card, Progress } from "antd";
import { applyContractsAction } from "@/actions/risk-settings";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { COLORS, resultHex } from "@/lib/theme";
import { BankrollLevelsTable } from "./bankroll-levels-table";

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-white/45">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function SuggestionAlert({ data }: { data: RiskDashboardData }) {
  const { message } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const { bankroll, account, config } = data;
  if (bankroll.suggestion === "manter") return null;

  function apply() {
    startTransition(async () => {
      const result = await applyContractsAction(account, config.asset, bankroll.suggestedContracts);
      if (result?.error) message.error(result.error);
      else message.success(result?.success);
    });
  }

  const up = bankroll.suggestion === "subir";
  const downReason = bankroll.protecting
    ? `Proteção de queda ativa: reduza para ${bankroll.suggestedContracts} contrato(s).`
    : `Banca abaixo do necessário para ${config.contracts} contratos: reduza para ${bankroll.suggestedContracts}.`;
  return (
    <Alert
      type={up ? "success" : "warning"}
      showIcon
      title={up ? `A banca comporta ${bankroll.suggestedContracts} contratos no risco de ${config.riskPercent}%.` : downReason}
      action={
        <Button size="small" type={up ? "primary" : "default"} danger={!up} loading={isPending} onClick={apply}>
          {up ? "Subir" : "Reduzir"}
        </Button>
      }
    />
  );
}

function ProtectionAlert({ data }: { data: RiskDashboardData }) {
  const { bankroll, config } = data;
  if (!bankroll.protecting) return null;
  return (
    <Alert
      className="mt-3"
      type="error"
      showIcon
      title={`Banca ${formatPercent(bankroll.drawdown)} abaixo do pico de ${formatCurrency(bankroll.peak)}`}
      description={`Passou do limite de ${config.drawdownLimit}%: contratos reduzidos na mesma proporção (${bankroll.unprotected} → ${bankroll.recommended}) até a banca voltar ao pico.`}
    />
  );
}

export function BankrollCard({ data }: { data: RiskDashboardData }) {
  const { config, bankroll, bankrollNet, bankrollLevels } = data;
  const title = (
    <span className="flex items-center gap-2">
      <WalletOutlined /> Gestão de banca · {config.asset}
    </span>
  );

  if (!bankroll.configured) {
    return (
      <Card title={title} className="h-full">
        <Alert
          type="info"
          showIcon
          title="Informe a banca inicial deste ativo para calcular quantos contratos operar."
          action={<Link href="/configuracoes">Configurar</Link>}
        />
      </Card>
    );
  }

  const overRisk = bankroll.currentRiskShare > config.riskPercent / 100;
  return (
    <Card title={title} extra={<Link href="/configuracoes" className="text-xs">Configurar</Link>} className="h-full">
      <div className="flex flex-wrap gap-8">
        <Info label="Banca atual" value={formatCurrency(bankroll.bankroll)} />
        <Info label="Operando" value={`${config.contracts} contr.`} />
        <Info
          label="Recomendado (risco / margem)"
          value={`${bankroll.recommended} contr. (${bankroll.byRisk} / ${bankroll.byMargin ?? "∞"})`}
        />
      </div>
      <p className="mt-2 text-xs text-white/45">
        Inicial {formatCurrency(config.initialBankroll)} em {formatDate(config.bankrollStartDate)} ·{" "}
        <span style={{ color: resultHex(bankrollNet) }}>{formatCurrency(bankrollNet)}</span> desde então · a cada{" "}
        {formatCurrency(bankroll.bankrollPerContract)} de banca, +1 contrato.
      </p>
      <p className="mt-1 text-xs" style={{ color: overRisk ? COLORS.loss : COLORS.textMuted }}>
        Stop global ({config.dailyStopLimit} pts) com {config.contracts} contr.: −{formatCurrency(bankroll.currentStopCost)} (
        {formatPercent(bankroll.currentRiskShare)} da banca) · aguenta {bankroll.stopDaysToRuin} stops seguidos.
      </p>
      <ProtectionAlert data={data} />
      {bankroll.atMax ? (
        <p className="mt-3 text-xs" style={{ color: COLORS.profit }}>
          Operando o máximo configurado de {config.maxContracts} contratos.
        </p>
      ) : (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-white/45">
            <span>Banca para {bankroll.nextContracts} contratos</span>
            <span>{formatCurrency(bankroll.requiredForNext)}</span>
          </div>
          <Progress percent={Math.round(bankroll.progressToNext * 100)} strokeColor={COLORS.profit} />
        </div>
      )}
      <div className="mb-3">
        <SuggestionAlert data={data} />
      </div>
      <BankrollLevelsTable levels={bankrollLevels} current={config.contracts} recommended={bankroll.recommended} />
    </Card>
  );
}
