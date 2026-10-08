"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "antd";
import { formatCurrency } from "@/lib/format";

// Os gráficos do antd desenham em canvas e dependem de window: carregados só no navegador.
const Line = dynamic(() => import("@ant-design/charts").then((mod) => mod.Line), {
  ssr: false,
  loading: () => <Skeleton active paragraph={{ rows: 5 }} />,
});

// Um ponto por rótulo do eixo X e série; a ordem dos dados define a ordem do eixo.
export type MoneyPoint = { label: string; value: number; series: string };

// Linha vertical tracejada num rótulo do eixo X (que precisa existir nos dados).
export type ChartMarker = { label: string; text: string; color: string };

type MoneyLineChartProps = {
  data: MoneyPoint[];
  colors: string[];
  height?: number;
  smooth?: boolean;
  markers?: ChartMarker[];
  // Texto extra no título do tooltip, por rótulo do eixo X (ex.: eventos do dia).
  details?: Record<string, string>;
};

const NO_DETAILS: Record<string, string> = {};

const compactCurrency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" });

function toAnnotations(markers: ChartMarker[]) {
  return markers.map((marker) => ({
    type: "lineX",
    data: [{ label: marker.label }],
    encode: { x: "label" },
    style: { stroke: marker.color, lineDash: [4, 4], lineWidth: 1 },
    labels: [{ text: () => marker.text, position: "top", style: { fill: marker.color, fontSize: 10, dy: -4 } }],
    tooltip: false,
  }));
}

export function MoneyLineChart({ data, colors, height = 260, smooth = true, markers = [], details = NO_DETAILS }: MoneyLineChartProps) {
  const title = (point: MoneyPoint) => (details[point.label] ? `${point.label} — ${details[point.label]}` : point.label);
  return (
    <Line
      data={data}
      xField="label"
      yField="value"
      colorField="series"
      height={height}
      shapeField={smooth ? "smooth" : "line"}
      theme={{ type: "classicDark", view: { viewFill: "transparent" } }}
      scale={{ color: { range: colors } }}
      axis={{ y: { labelFormatter: (value: number) => compactCurrency.format(value), title: false }, x: { title: false } }}
      tooltip={{ title, items: [{ channel: "y", valueFormatter: formatCurrency }] }}
      legend={{ color: { position: "top" } }}
      annotations={toAnnotations(markers)}
    />
  );
}
