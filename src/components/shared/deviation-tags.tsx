"use client";

import { Tag } from "antd";
import type { DeviationCounts, DeviationKind } from "@/lib/day-deviation";

export const DEVIATION_KINDS: { kind: DeviationKind; label: string; color: string }[] = [
  { kind: "stop-excedido", label: "stop excedido", color: "red" },
  { kind: "meta-excedida", label: "meta excedida", color: "gold" },
  { kind: "longe-dos-limites", label: "longe dos limites", color: "orange" },
];

export const daysLabel = (count: number) => (count === 1 ? "1 dia" : `${count} dias`);

// Uma etiqueta por tipo de desvio presente na contagem.
export function DeviationTags({ counts }: { counts: DeviationCounts }) {
  return (
    <>
      {DEVIATION_KINDS.filter(({ kind }) => counts[kind] > 0).map(({ kind, label, color }) => (
        <Tag key={kind} color={color} className="m-0!">
          {counts[kind]} {label}
        </Tag>
      ))}
    </>
  );
}
