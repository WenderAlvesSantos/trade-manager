"use client";

import { ArrowDownOutlined, ArrowUpOutlined, WarningOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import type { Asset } from "@/generated/prisma/enums";
import type { DayDeviation } from "@/lib/day-deviation";
import type { ProjectedAsset } from "@/lib/daily-projection";
import { COLORS, resultHex } from "@/lib/theme";
import type { DaySummary } from "@/lib/trade-aggregations";

export const colored = (value: number, text: string, bold = false) => (
  <span style={{ color: resultHex(value), fontWeight: bold ? 600 : undefined }}>{text}</span>
);

// Um valor por ativo; o nome do ativo só aparece quando há mais de um.
export function PerAsset({ items }: { items: { asset: Asset; content: React.ReactNode }[] }) {
  return (
    <span className="flex flex-col items-end">
      {items.map(({ asset, content }) => (
        <span key={asset} className="whitespace-nowrap">
          {content}
          {items.length > 1 && <span className="ml-1 text-xs text-white/45">{asset}</span>}
        </span>
      ))}
    </span>
  );
}

// Pontos de WIN e WDO têm valores diferentes, por isso são exibidos separados quando o dia tem os dois.
export function RealizedPoints({ pointsByAsset }: Pick<DaySummary, "pointsByAsset">) {
  const items = Object.entries(pointsByAsset).map(([asset, { gained, lost }]) => ({
    asset: asset as Asset,
    content: colored(gained - lost, (gained - lost).toLocaleString("pt-BR")),
  }));
  return <PerAsset items={items} />;
}

export function ProjectedPoints({ assets }: { assets: ProjectedAsset[] }) {
  const items = assets.map((item) => ({
    asset: item.asset,
    content: (
      <>
        {colored(item.points, `${item.points > 0 ? "+" : ""}${item.points.toLocaleString("pt-BR")}`)}
        <span className="ml-1 text-xs text-white/45">{item.kind === "loss" ? "stop" : "meta"}</span>
      </>
    ),
  }));
  return <PerAsset items={items} />;
}

// Contratos do dia para o seguinte: seta verde quando sobe, vermelha quando reduz.
export function PlanCell({ plan, current }: { plan: number; current: number }) {
  if (plan === current) return <span>{plan}</span>;
  const up = plan > current;
  return (
    <span style={{ color: up ? COLORS.profit : COLORS.loss }} className="whitespace-nowrap">
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {plan}
    </span>
  );
}

// Ícone de alerta quando o dia fugiu da meta/stop do robô além da tolerância (em qualquer ativo operado).
export function DeviationIcon({ deviations }: { deviations?: DayDeviation[] }) {
  if (!deviations?.length) return null;
  const color = deviations.some((item) => item.kind === "stop-excedido") ? COLORS.loss : COLORS.warning;
  const label = deviations.map((item) => item.message).join(" ");
  return (
    <Tooltip
      title={
        <ul className="flex flex-col gap-1">
          {deviations.map((item) => (
            <li key={item.asset}>{item.message}</li>
          ))}
        </ul>
      }
    >
      <WarningOutlined className="ml-2" style={{ color }} aria-label={label} />
    </Tooltip>
  );
}
