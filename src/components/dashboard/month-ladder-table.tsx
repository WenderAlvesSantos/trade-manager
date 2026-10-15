"use client";

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { Table, Tag, type TableColumnsType } from "antd";
import { formatCurrency, formatDate } from "@/lib/format";
import type { LadderDay, LadderDayKind } from "@/lib/month-ladder";
import { COLORS, resultHex } from "@/lib/theme";

const KIND_TAG: Record<LadderDayKind, { color: string; label: string }> = {
  loss: { color: "red", label: "stop" },
  gain: { color: "green", label: "meta" },
  partial: { color: "orange", label: "stop" },
  average: { color: "blue", label: "média" },
};

// Com vários ativos na banca, o stop mostra quais ativos pararam.
function KindTag({ day, multiAsset }: { day: LadderDay; multiAsset: boolean }) {
  const { color, label } = KIND_TAG[day.kind];
  const assets = multiAsset && day.stoppedAssets.length > 0 ? ` ${day.stoppedAssets.join(" + ")}` : "";
  return <Tag color={color} className="m-0!">{label}{assets}</Tag>;
}

function NextContracts({ day }: { day: LadderDay }) {
  if (day.nextContracts === null) return <span className="text-white/30">—</span>;
  const up = day.nextContracts > day.contracts;
  return (
    <span style={{ color: up ? COLORS.profit : COLORS.loss }}>
      {up ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {day.nextContracts} contr.
    </span>
  );
}

const columns = (multiAsset: boolean): TableColumnsType<LadderDay> => [
  { title: "Pregão", dataIndex: "day", render: (day: string) => formatDate(day) },
  { title: "Dia", key: "kind", render: (_, day) => <KindTag day={day} multiAsset={multiAsset} /> },
  { title: "Contratos", dataIndex: "contracts", align: "right" },
  {
    title: "Resultado",
    dataIndex: "net",
    align: "right",
    render: (value: number) => <span style={{ color: resultHex(value) }}>{formatCurrency(value)}</span>,
  },
  { title: "Banca", dataIndex: "bankroll", align: "right", render: (value: number) => formatCurrency(value) },
  { title: "Próximo pregão", key: "next", align: "right", render: (_, day) => <NextContracts day={day} /> },
];

export function MonthLadderTable({ days, multiAsset }: { days: LadderDay[]; multiAsset: boolean }) {
  return (
    <Table rowKey="day" size="small" columns={columns(multiAsset)} dataSource={days} pagination={false} scroll={{ x: 600 }} />
  );
}
