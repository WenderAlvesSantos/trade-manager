"use client";

import { LineChartOutlined } from "@ant-design/icons";
import { Card, Divider, Empty, Tag } from "antd";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { RiskDashboardData } from "@/lib/risk-dashboard-data";
import { COLORS, resultHex } from "@/lib/theme";
import { EVOLUTION_COLORS, evolutionChart } from "./bankroll-evolution-data";
import { MoneyLineChart } from "./money-line-chart";
import { RiskComparisonPanel } from "./risk-comparison-panel";

function ProtectionSummary({ data }: { data: RiskDashboardData }) {
  const { protectionEvents, config } = data;
  const activations = protectionEvents.filter((event) => event.on).length;
  if (config.drawdownLimit <= 0) return <p className="text-xs text-white/45">Proteção de queda desligada.</p>;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
      <span>
        Proteção ({config.drawdownLimit}% do pico) atuou {activations} {activations === 1 ? "vez" : "vezes"}
        {activations > 0 ? ":" : "."}
      </span>
      {protectionEvents.map((event) => (
        <Tag key={`${event.day}-${event.on}`} color={event.on ? "red" : "green"} className="m-0!">
          {event.on ? "Ligou" : "Desligou"} {formatDate(event.day)} · {formatCurrency(event.bankroll)}
        </Tag>
      ))}
    </div>
  );
}

function SimulationSummary({ data }: { data: RiskDashboardData }) {
  const { simulation, bankroll, config } = data;
  const difference = simulation.bankroll - bankroll.bankroll;
  return (
    <p className="text-xs text-white/45">
      Seguindo as recomendações todo dia desde {formatDate(config.bankrollStartDate)}, com as regras de cada época (stop,
      risco, margem e proteção), a banca estaria em{" "}
      <span className="font-semibold text-white/85">{formatCurrency(simulation.bankroll)}</span> (
      <span style={{ color: resultHex(difference) }}>
        {difference >= 0 ? "+" : ""}
        {formatCurrency(difference)}
      </span>{" "}
      vs. real) com {simulation.contractChanges} mudança(s) de contratos. Queda máxima: real{" "}
      <span style={{ color: COLORS.loss }}>{formatPercent(data.bankrollMaxDrawdown)}</span> · simulada{" "}
      <span style={{ color: COLORS.loss }}>{formatPercent(simulation.maxDrawdown)}</span>.
    </p>
  );
}

// Banca real por dia operado, pico, banca mínima para os contratos atuais e a simulação seguindo as recomendações.
export function BankrollEvolutionCard({ data }: { data: RiskDashboardData }) {
  const { config, bankroll, bankrollHistory } = data;
  if (!bankroll.configured) return null;
  const chart = evolutionChart(data);

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <LineChartOutlined /> Evolução da banca · {data.label}
        </span>
      }
      extra={
        <span className="text-xs text-white/45">
          Pico {formatCurrency(bankroll.peak)} · queda {formatPercent(bankroll.drawdown)} · máx.{" "}
          {formatPercent(data.bankrollMaxDrawdown)}
        </span>
      }
    >
      {bankrollHistory.length > 1 ? (
        <div className="flex flex-col gap-3">
          <MoneyLineChart
            data={chart.series}
            colors={EVOLUTION_COLORS}
            markers={chart.markers}
            details={chart.details}
            smooth={false}
          />
          <SimulationSummary data={data} />
          <ProtectionSummary data={data} />
          <Divider className="my-1!" titlePlacement="start" plain>
            Qual risco e proteção teriam rendido melhor?
          </Divider>
          <RiskComparisonPanel data={data} />
        </div>
      ) : (
        <Empty description={`Sem dias operados em ${data.label} desde ${formatDate(config.bankrollStartDate)}.`} />
      )}
    </Card>
  );
}
