"use client";

import { Card, Divider, Statistic } from "antd";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  breakEvenLossDays,
  dailyRisk,
  minimumWinRate,
  projectedDayNet,
  projectMonth,
  type RiskConfig,
} from "@/lib/risk-projection";
import { COLORS, resultHex } from "@/lib/theme";
import type { EquityPoint } from "@/lib/trade-aggregations";
import { BankrollPreview } from "./bankroll-preview";
import { PreviewRow } from "./preview-row";

const SCENARIOS = [2, 3, 4];

type RiskSettingsPreviewProps = { config: RiskConfig; bankrollCurve: EquityPoint[]; businessDays: number };

// Prévia ao vivo: recalcula a cada alteração do formulário, antes de salvar.
export function RiskSettingsPreview({ config, bankrollCurve, businessDays }: RiskSettingsPreviewProps) {
  const valid = config.contracts > 0 && config.projectedGainDay > 0 && config.projectedLossDay > 0;
  if (!valid) return <Card title="Prévia" size="small">Preencha os campos para ver a projeção.</Card>;

  const gainDay = projectedDayNet(config, config.contracts, "gain");
  const lossDay = projectedDayNet(config, config.contracts, "loss");
  const fullMonth = projectMonth(config, [], businessDays, 3).total;

  return (
    <Card title={`Prévia ${config.asset}`} size="small" className="h-fit lg:sticky lg:top-6">
      <Statistic
        title={`Mês cheio (${businessDays} pregões, 3 stops)`}
        value={formatCurrency(fullMonth)}
        styles={{ content: { color: resultHex(fullMonth), fontWeight: 600 } }}
      />
      <Divider className="my-3!" />
      <PreviewRow label="Dia de meta (líquido)" value={formatCurrency(gainDay)} color={COLORS.profit} />
      <PreviewRow label="Dia de stop (líquido)" value={formatCurrency(lossDay)} color={COLORS.loss} />
      <PreviewRow label="Risco por dia (projetado)" value={formatCurrency(dailyRisk(config, config.contracts))} />
      <PreviewRow label="Win rate mínimo por trade" value={formatPercent(minimumWinRate(config))} />
      <PreviewRow label="Ponto de equilíbrio" value={`até ${breakEvenLossDays(config, businessDays)} stops/mês`} />
      <Divider className="my-3!" />
      {SCENARIOS.map((lossDays) => (
        <PreviewRow
          key={lossDays}
          label={`${lossDays} stops no mês`}
          value={formatCurrency(projectMonth(config, [], businessDays, lossDays).total)}
        />
      ))}
      <Divider className="my-3!" titlePlacement="start" plain>
        Banca
      </Divider>
      <BankrollPreview config={config} bankrollCurve={bankrollCurve} />
    </Card>
  );
}
