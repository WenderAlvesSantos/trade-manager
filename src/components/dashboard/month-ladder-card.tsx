"use client";

import { useMemo, useState } from "react";
import { FieldTimeOutlined } from "@ant-design/icons";
import { Alert, Card, Segmented } from "antd";
import { formatCurrency, formatDate } from "@/lib/format";
import { monthLadder, type LadderScenario, type MonthLadder, type StopOrder } from "@/lib/month-ladder";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import type { StopsMode } from "@/lib/stops-mode";
import { MonthLadderTable } from "./month-ladder-table";
import { StopsModeSelect, useStopsMode } from "./stops-mode-select";
import { isCombined } from "./unit-labels";
import {
  DEFAULT_SCENARIO,
  findAverageScenario,
  findStopScenario,
  parseScenarioKey,
  scenarioOptions,
  type ScenarioKey,
} from "./projection-scenarios";

function ladderScenario(data: RiskDashboardData, key: ScenarioKey): LadderScenario {
  const average = findAverageScenario(data, key);
  if (average) return { dailyNetPerContract: average.projection.average / Math.max(data.config.contracts, 1) };
  return { pendingLossDays: findStopScenario(data, key).pendingLossDays };
}

const ORDER_OPTIONS: { value: StopOrder; label: string }[] = [
  { value: "first", label: "Stops primeiro" },
  { value: "spread", label: "Distribuídos" },
  { value: "last", label: "Stops no fim" },
];

const ORDER_TEXT: Record<StopOrder, string> = {
  first: "vêm primeiro: os aumentos chegam mais tarde, mas cada stop pega menos contratos",
  spread: "ficam distribuídos ao longo do mês",
  last: "ficam no fim do mês: os aumentos chegam mais cedo, mas os stops pegam mais contratos",
};

const STOPS_TEXT: Record<StopsMode, string> = {
  together: "em todos os ativos no mesmo dia",
  alternate: "em cada ativo, em pregões diferentes",
};

type SummaryProps = { ladder: MonthLadder; data: RiskDashboardData; scenario: LadderScenario; order: StopOrder; stops: StopsMode };

function scenarioText({ data, scenario, order, stops }: Omit<SummaryProps, "ladder">) {
  if (!("pendingLossDays" in scenario)) return "Todos os pregões com a média diária do cenário, por contrato.";
  const where = isCombined(data) ? ` ${STOPS_TEXT[stops]}` : "";
  return `Os ${scenario.pendingLossDays} stop(s) que faltam no cenário${where} ${ORDER_TEXT[order]}; os demais pregões são dias de meta.`;
}

function Summary({ ladder, ...props }: SummaryProps) {
  const { data } = props;
  const increases = ladder.changes.filter((change) => change.to > change.from);
  const cadence = increases.map((change) => `${formatDate(change.day)} → ${change.to} contr.`).join(" · ");
  const buffer = data.config.increaseBuffer;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>
        {scenarioText(props)}
        {buffer > 0 && ` Só sobe quando a banca aguenta ${buffer} stop(s) seguido(s) com os novos contratos.`}
      </span>
      <span>
        {ladder.gainDaysToNext === null
          ? data.config.maxContracts > 0 && ladder.startContracts >= data.config.maxContracts
            ? `Já no máximo de ${data.config.maxContracts} contratos.`
            : "Com o dia de meta atual, +1 contrato não é liberado nos próximos 60 pregões."
          : `A partir de hoje, ${ladder.gainDaysToNext} dia(s) de meta liberam ${ladder.startContracts + 1} contratos.`}
      </span>
      <span>
        {increases.length > 0
          ? `Aumentos no mês: ${cadence} (a cada ${increases.map((change) => change.afterDays).join(", ")} pregão(ões)).`
          : "Nenhum aumento seguro neste mês com este cenário."}{" "}
        Fecha o mês com {ladder.endContracts} contr. e banca de {formatCurrency(ladder.endBankroll)}.
      </span>
    </div>
  );
}

// Quando dá para subir contratos ainda neste mês sem passar do risco %, da margem, da proteção e do máximo.
export function MonthLadderCard({ data }: { data: RiskDashboardData }) {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>(DEFAULT_SCENARIO);
  const [order, setOrder] = useState<StopOrder>("first");
  const [stops, setStops] = useStopsMode(data);
  const scenario = useMemo(() => ladderScenario(data, scenarioKey), [data, scenarioKey]);
  const ladder = useMemo(
    () =>
      monthLadder(data.config, {
        bankroll: data.bankroll.bankroll,
        drawdown: data.bankrollDrawdown,
        pendingDays: data.pendingDays,
        scenario,
        order,
        assets: data.configs,
        stops,
      }),
    [data, scenario, order, stops],
  );

  if (!data.bankroll.configured) return null;
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <FieldTimeOutlined /> Aumentos de contrato em {data.monthLabel} · {data.label}
        </span>
      }
      extra={
        <Segmented
          size="small"
          value={scenarioKey}
          onChange={(value) => setScenarioKey(parseScenarioKey(value))}
          options={scenarioOptions(data, "stops")}
        />
      }
    >
      {data.pendingDays.length === 0 ? (
        <Alert type="info" showIcon title="Não há pregões pendentes neste mês." />
      ) : (
        <div className="flex flex-col gap-3">
          {"pendingLossDays" in scenario && (
            <div className="flex flex-wrap gap-2">
              <Segmented size="small" value={order} onChange={setOrder} options={ORDER_OPTIONS} />
              {isCombined(data) && <StopsModeSelect value={stops} onChange={setStops} />}
            </div>
          )}
          <Summary ladder={ladder} data={data} scenario={scenario} order={order} stops={stops} />
          <MonthLadderTable days={ladder.days} multiAsset={isCombined(data)} />
          <p className="text-xs text-white/45">
            Os contratos de cada pregão são os que a banca do fechamento anterior comporta com risco de{" "}
            {data.config.riskPercent}% por dia de stop, margem, proteção de queda, máximo e folga para subir
            configurados: subir assim nunca deixa um dia de stop passar do risco escolhido.
            {isCombined(data) &&
              " Com a banca única, os contratos valem para cada ativo. \"Stops juntos\" é o pior caso; \"Alternados\" segue a projeção da listagem de Trades: o dia de stop é mais leve, mas há mais dias com stop e eles podem pegar mais contratos."}
          </p>
        </div>
      )}
    </Card>
  );
}
