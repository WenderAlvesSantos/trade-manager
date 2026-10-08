"use client";

import {
  AccountBookOutlined,
  FallOutlined,
  PercentageOutlined,
  RiseOutlined,
  TrophyOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { formatCurrency, formatPercent } from "@/lib/format";
import { COLORS, resultHex } from "@/lib/theme";
import type { PeriodSummary, PointsBreakdown } from "@/lib/trade-aggregations";
import { StatCard, type StatItem } from "./stat-card";

function PointsValue({ pointsByAsset, pick }: { pointsByAsset: PeriodSummary["pointsByAsset"]; pick: keyof PointsBreakdown }) {
  const entries = Object.entries(pointsByAsset);
  if (entries.length === 0) return <>0</>;
  return (
    <span className="flex flex-col">
      {entries.map(([asset, breakdown]) => (
        <span key={asset}>
          {breakdown[pick].toLocaleString("pt-BR")}
          <span className="ml-1 text-sm font-normal text-white/45">{asset}</span>
        </span>
      ))}
    </span>
  );
}

function buildItems(summary: PeriodSummary): StatItem[] {
  return [
    { title: "Resultado Bruto", value: formatCurrency(summary.grossResult), icon: <RiseOutlined />, color: resultHex(summary.grossResult) },
    {
      title: "Total de Taxas",
      value: formatCurrency(summary.fees + summary.irrf),
      icon: <AccountBookOutlined />,
      hint: `B3 ${formatCurrency(summary.fees)} + IRRF ${formatCurrency(summary.irrf)}`,
    },
    { title: "Resultado Líquido", value: formatCurrency(summary.netResult), icon: <WalletOutlined />, color: resultHex(summary.netResult) },
    { title: "Win Rate", value: formatPercent(summary.winRate), icon: <PercentageOutlined />, hint: `${summary.tradeCount} trade(s) no filtro` },
    {
      title: "Pontos Ganhos",
      value: <PointsValue pointsByAsset={summary.pointsByAsset} pick="gained" />,
      icon: <TrophyOutlined />,
      color: COLORS.profit,
      hint: "Soma dos trades positivos",
    },
    {
      title: "Pontos Perdidos",
      value: <PointsValue pointsByAsset={summary.pointsByAsset} pick="lost" />,
      icon: <FallOutlined />,
      color: COLORS.loss,
      hint: "Soma dos trades negativos",
    },
  ];
}

export function SummaryCards({ summary }: { summary: PeriodSummary }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {buildItems(summary).map((item) => (
        <StatCard key={item.title} {...item} />
      ))}
    </section>
  );
}
