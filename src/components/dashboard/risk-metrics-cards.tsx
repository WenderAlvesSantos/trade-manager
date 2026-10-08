"use client";

import {
  ArrowDownOutlined,
  CalculatorOutlined,
  FireOutlined,
  FundOutlined,
  PieChartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { formatCurrency, formatPercent } from "@/lib/format";
import { COLORS, resultHex } from "@/lib/theme";
import type { RiskMetrics } from "@/lib/trade-metrics";
import { StatCard, type StatItem } from "./stat-card";

const days = (count: number) => `${count} dia${count === 1 ? "" : "s"}`;

function describeCurrentStreak(streak: number) {
  if (streak > 0) return `${days(streak)} positivo${streak === 1 ? "" : "s"}`;
  if (streak < 0) return `${days(-streak)} negativo${streak === -1 ? "" : "s"}`;
  return "—";
}

function profitFactorItem(profitFactor: number | null): StatItem {
  return {
    title: "Fator de Lucro",
    value: profitFactor === null ? "—" : profitFactor.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
    icon: <CalculatorOutlined />,
    color: profitFactor === null ? undefined : profitFactor >= 1 ? COLORS.profit : COLORS.loss,
    hint: profitFactor === null ? "Sem trades perdedores no período" : "Ganhos ÷ perdas dos trades (após taxas B3)",
  };
}

function buildItems(metrics: RiskMetrics, profitFactor: number | null): StatItem[] {
  const hasDrawdown = metrics.maxDrawdown > 0;
  return [
    profitFactorItem(profitFactor),
    {
      title: "Maior Drawdown",
      value: formatCurrency(-metrics.maxDrawdown),
      icon: <ArrowDownOutlined />,
      color: hasDrawdown ? COLORS.loss : undefined,
      hint: "Maior queda do acumulado a partir de um topo",
    },
    {
      title: "Drawdown %",
      value: metrics.maxDrawdownPercent === null ? "—" : formatPercent(-metrics.maxDrawdownPercent),
      icon: <PieChartOutlined />,
      color: metrics.maxDrawdownPercent ? COLORS.loss : undefined,
      hint: "Maior queda relativa ao topo do acumulado",
    },
    {
      title: "Maior Sequência de Ganhos",
      value: days(metrics.maxWinStreak),
      icon: <FireOutlined />,
      color: metrics.maxWinStreak > 0 ? COLORS.profit : undefined,
      hint: "Dias positivos seguidos (líquido)",
    },
    {
      title: "Maior Sequência de Perdas",
      value: days(metrics.maxLossStreak),
      icon: <ThunderboltOutlined />,
      color: metrics.maxLossStreak > 0 ? COLORS.loss : undefined,
      hint: "Dias negativos seguidos (líquido)",
    },
    {
      title: "Sequência Atual",
      value: describeCurrentStreak(metrics.currentStreak),
      icon: <FundOutlined />,
      color: resultHex(metrics.currentStreak),
      hint: "Contando a partir do último dia operado",
    },
  ];
}

type RiskMetricsCardsProps = { metrics: RiskMetrics; profitFactor: number | null };

export function RiskMetricsCards({ metrics, profitFactor }: RiskMetricsCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {buildItems(metrics, profitFactor).map((item) => (
        <StatCard key={item.title} {...item} />
      ))}
    </section>
  );
}
