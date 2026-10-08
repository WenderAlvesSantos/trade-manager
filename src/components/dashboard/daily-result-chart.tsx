"use client";

import dynamic from "next/dynamic";
import { Card, Empty, Skeleton } from "antd";
import { formatCurrency, formatDate } from "@/lib/format";
import { COLORS } from "@/lib/theme";
import type { EquityPoint } from "@/lib/trade-aggregations";

// Os gráficos do antd desenham em canvas e dependem de window: carregados só no navegador.
const DualAxes = dynamic(() => import("@ant-design/charts").then((mod) => mod.DualAxes), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 6 }} />,
});

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
});

const currencyAxis = { labelFormatter: (value: number) => compactCurrency.format(value) };

function buildConfig(data: EquityPoint[]) {
  return {
    data,
    xField: "day",
    height: 300,
    theme: { type: "classicDark", view: { viewFill: "transparent" } },
    axis: { x: { labelFormatter: (day: string) => formatDate(day).slice(0, 5) } },
    legend: { color: { itemMarker: "square" } },
    children: [
      {
        type: "interval",
        yField: "net",
        style: { fill: (point: EquityPoint) => (point.net >= 0 ? COLORS.profit : COLORS.loss), radius: 3, maxWidth: 32 },
        axis: { y: { ...currencyAxis, title: false } },
        tooltip: { title: (point: EquityPoint) => formatDate(point.day), items: [{ channel: "y", name: "Líquido do dia", valueFormatter: formatCurrency }] },
      },
      {
        type: "line",
        yField: "cumulative",
        shapeField: "smooth",
        style: { stroke: COLORS.primary, lineWidth: 2 },
        scale: { y: { key: "net" } },
        axis: { y: false },
        tooltip: { items: [{ channel: "y", name: "Acumulado", valueFormatter: formatCurrency }] },
      },
    ],
  };
}

export function DailyResultChart({ data }: { data: EquityPoint[] }) {
  return (
    <Card title="Evolução do resultado" extra={<span className="text-xs text-white/45">Barras: líquido do dia · Linha: acumulado</span>}>
      {data.length === 0 ? (
        <Empty description="Sem dados para o período." />
      ) : (
        <DualAxes {...buildConfig(data)} />
      )}
    </Card>
  );
}
