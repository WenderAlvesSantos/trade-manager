"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RiseOutlined } from "@ant-design/icons";
import { Alert, Card, Segmented, Table, Tag, type TableColumnsType } from "antd";
import { contractPlan, PLAN_HORIZON_MONTHS, riskTimelines, streakLoss, type PlanStep } from "@/lib/contract-plan";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { exceedsLiquidity, LIQUID_CONTRACTS } from "@/lib/risk-projection";
import { COLORS } from "@/lib/theme";
import { ContractPlanRisks, labelOfMonth } from "./contract-plan-risks";
import {
  DEFAULT_SCENARIO,
  forecastScenarioFor,
  parseScenarioKey,
  pendingNetFor,
  scenarioOptions,
  type ScenarioKey,
} from "./projection-scenarios";

function forecastLabel(step: PlanStep) {
  if (step.reached) return <Tag color="green" className="m-0!">liberado</Tag>;
  if (!step.reachedAt) return <span className="text-white/45">+{PLAN_HORIZON_MONTHS / 12} anos</span>;
  return (
    <span className="capitalize">
      {labelOfMonth(step.reachedAt)} <span className="text-white/45">({step.monthsAhead} m)</span>
    </span>
  );
}

const COLUMNS: TableColumnsType<PlanStep> = [
  { title: "Contratos", dataIndex: "contracts", render: (value: number) => <span className="font-medium">{value}</span> },
  { title: "Banca necessária", dataIndex: "requiredBankroll", align: "right", render: (value: number) => formatCurrency(value) },
  {
    title: "Lucro que falta",
    dataIndex: "missing",
    align: "right",
    render: (value: number) => (value > 0 ? formatCurrency(value) : <span style={{ color: COLORS.profit }}>—</span>),
  },
  {
    title: "Dia de stop",
    dataIndex: "stopCost",
    align: "right",
    render: (value: number) => <span style={{ color: COLORS.loss }}>−{formatCurrency(value)}</span>,
  },
  { title: "Previsão", key: "forecast", align: "right", render: (_, step) => forecastLabel(step) },
];

function SafetyNote({ data }: { data: RiskDashboardData }) {
  const { riskPercent } = data.config;
  const loss = streakLoss(riskPercent, 4);
  return (
    <Alert
      type={riskPercent > 10 ? "warning" : "info"}
      showIcon
      title={`Risco de ${riskPercent}% por dia de stop: 4 stops seguidos no limite levam cerca de ${formatPercent(loss)} da banca.`}
      description={
        riskPercent > 10
          ? "Para crescer com segurança, prefira entre 2% e 10%: o caminho fica mais longo, mas uma sequência ruim não compromete a banca."
          : "Cada etapa só é liberada quando a banca comporta os contratos dentro desse risco; se ela cair, a recomendação volta."
      }
    />
  );
}

// Caminho da banca atual até o máximo de contratos configurado, com a previsão no cenário escolhido.
export function ContractPlanCard({ data }: { data: RiskDashboardData }) {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>(DEFAULT_SCENARIO);
  const { config, bankroll } = data;

  const { plan, timelines } = useMemo(() => {
    const options = {
      start: data.nextMonth,
      scenario: forecastScenarioFor(data, scenarioKey),
      initialBankroll: bankroll.bankroll + pendingNetFor(data, scenarioKey),
      drawdown: data.bankrollDrawdown,
    };
    return {
      plan: contractPlan(config, bankroll.bankroll, options),
      timelines: riskTimelines(config, bankroll.bankroll, options),
    };
  }, [data, config, bankroll.bankroll, scenarioKey]);

  if (!bankroll.configured) return null;
  const title = (
    <span className="flex items-center gap-2">
      <RiseOutlined /> Plano até {config.maxContracts > 0 ? `${config.maxContracts} contratos` : "o máximo"} · {config.asset}
    </span>
  );

  if (!plan) {
    return (
      <Card title={title}>
        <Alert
          type="info"
          showIcon
          title="Defina o máximo de contratos que deseja operar para ver o caminho até lá."
          action={<Link href="/configuracoes">Configurar</Link>}
        />
      </Card>
    );
  }

  const target = plan.steps.at(-1)!;
  return (
    <Card
      title={title}
      extra={
        <Segmented
          size="small"
          value={scenarioKey}
          onChange={(value) => setScenarioKey(parseScenarioKey(value))}
          options={scenarioOptions(data, "stops/mês")}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          Para operar <strong>{plan.target} contratos</strong> com risco de {config.riskPercent}% por dia de stop, a banca
          precisa de <strong>{formatCurrency(target.requiredBankroll)}</strong> (dia de stop de −
          {formatCurrency(target.stopCost)}). Hoje a banca de {formatCurrency(bankroll.bankroll)} libera {plan.current}{" "}
          contrato(s).
        </p>
        <SafetyNote data={data} />
        {exceedsLiquidity(config) && (
          <Alert
            type="warning"
            showIcon
            title={`${plan.target} contratos passa da liquidez razoável do ${config.asset} (~${LIQUID_CONTRACTS[config.asset]} contratos).`}
            description="Acima disso, ordens a mercado do robô tendem a pegar vários preços do livro (slippage) e o resultado real fica pior que o projetado. Considere dividir as entradas ou parar num máximo menor."
          />
        )}
        <Table rowKey="contracts" size="small" columns={COLUMNS} dataSource={plan.steps} pagination={false} />
        <ContractPlanRisks rows={timelines} />
        <p className="text-xs text-white/45">
          A previsão repete o cenário escolhido mês a mês, reinvestindo o lucro e redimensionando os contratos pela banca
          (com proteção de queda e o teto de {plan.target}). Margem da corretora considerada:{" "}
          {config.marginPerContract > 0 ? `${formatCurrency(config.marginPerContract)} por contrato` : "sem teto"}.
          Slippage e custos fora da B3 não entram.
        </p>
      </div>
    </Card>
  );
}
