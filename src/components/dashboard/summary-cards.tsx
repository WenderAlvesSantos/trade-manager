import { Percent, Receipt, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, resultColor } from "@/lib/format";
import type { TradeSummary } from "@/lib/trades";

type SummaryItem = {
  title: string;
  value: string;
  icon: LucideIcon;
  className?: string;
  hint?: string;
};

function buildItems(summary: TradeSummary): SummaryItem[] {
  return [
    {
      title: "Resultado Bruto Total",
      value: formatCurrency(summary.grossTotal),
      icon: TrendingUp,
    },
    {
      title: "Total em Taxas e Impostos",
      value: formatCurrency(summary.costsTotal),
      icon: Receipt,
      hint: "Taxas B3 + IRRF (1%)",
    },
    {
      title: "Resultado Líquido Acumulado",
      value: formatCurrency(summary.netTotal),
      icon: Wallet,
      className: resultColor(summary.netTotal),
    },
    {
      title: "Win Rate",
      value: formatPercent(summary.winRate),
      icon: Percent,
      hint: `${summary.tradeCount} trade(s) registrado(s)`,
    },
  ];
}

export function SummaryCards({ summary }: { summary: TradeSummary }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {buildItems(summary).map(({ title, value, icon: Icon, className, hint }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${className ?? ""}`}>{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
