import {
  Percent,
  Receipt,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, resultColor } from "@/lib/format";
import type { PeriodSummary, PointsBreakdown } from "@/lib/trade-aggregations";

type SummaryItem = {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  className?: string;
  hint?: string;
};

function PointsValue({
  pointsByAsset,
  pick,
}: {
  pointsByAsset: PeriodSummary["pointsByAsset"];
  pick: keyof PointsBreakdown;
}) {
  const entries = Object.entries(pointsByAsset);
  if (entries.length === 0) return <>0</>;
  return (
    <span className="flex flex-col">
      {entries.map(([asset, breakdown]) => (
        <span key={asset}>
          {breakdown[pick].toLocaleString("pt-BR")}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{asset}</span>
        </span>
      ))}
    </span>
  );
}

function buildItems(summary: PeriodSummary): SummaryItem[] {
  return [
    {
      title: "Resultado Bruto",
      value: formatCurrency(summary.grossResult),
      icon: TrendingUp,
      className: resultColor(summary.grossResult),
    },
    {
      title: "Total de Taxas",
      value: formatCurrency(summary.fees + summary.irrf),
      icon: Receipt,
      hint: `B3 ${formatCurrency(summary.fees)} + IRRF ${formatCurrency(summary.irrf)}`,
    },
    {
      title: "Resultado Líquido",
      value: formatCurrency(summary.netResult),
      icon: Wallet,
      className: resultColor(summary.netResult),
    },
    {
      title: "Win Rate",
      value: formatPercent(summary.winRate),
      icon: Percent,
      hint: `${summary.tradeCount} trade(s) no filtro`,
    },
    {
      title: "Pontos Ganhos",
      value: <PointsValue pointsByAsset={summary.pointsByAsset} pick="gained" />,
      icon: Trophy,
      className: "text-emerald-600",
      hint: "Soma dos trades positivos",
    },
    {
      title: "Pontos Perdidos",
      value: <PointsValue pointsByAsset={summary.pointsByAsset} pick="lost" />,
      icon: TrendingDown,
      className: "text-red-600",
      hint: "Soma dos trades negativos",
    },
  ];
}

export function SummaryCards({ summary }: { summary: PeriodSummary }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {buildItems(summary).map(({ title, value, icon: Icon, className, hint }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${className ?? ""}`}>{value}</div>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
