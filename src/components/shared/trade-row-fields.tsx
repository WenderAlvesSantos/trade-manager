"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { Button, DatePicker, Form, InputNumber, Select, Typography } from "antd";
import type { Dayjs } from "dayjs";
import type { AccountType, Asset } from "@/generated/prisma/enums";
import { formatCurrency } from "@/lib/format";
import { calculateTradeResult } from "@/lib/trade-calculations";
import { ACCOUNT_OPTIONS } from "@/lib/trade-filters";
import { resultHex } from "@/lib/theme";

export type TradeRowValues = {
  date: Dayjs;
  accountType: AccountType;
  asset: Asset;
  contracts?: number;
  points?: number;
};

export const TRADE_ROW_GRID =
  "grid grid-cols-2 gap-2 sm:grid-cols-[9.5rem_8rem_6.5rem_6.5rem_7rem_1fr_2rem] sm:items-start";

const ASSET_OPTIONS = [
  { value: "WIN", label: "WIN" },
  { value: "WDO", label: "WDO" },
];

const required = (message: string) => [{ required: true, message }];

function RowPreview({ name }: { name: number }) {
  const row = Form.useWatch(["trades", name]) as TradeRowValues | undefined;
  if (!row?.asset || !row.contracts || row.points === undefined || row.points === null) {
    return <Typography.Text type="secondary">—</Typography.Text>;
  }
  const { grossResult, fees } = calculateTradeResult({
    asset: row.asset,
    contracts: row.contracts,
    points: row.points,
  });
  return (
    <span className="text-xs leading-8">
      <span style={{ color: resultHex(grossResult) }}>{formatCurrency(grossResult)}</span>
      <Typography.Text type="secondary" className="text-xs!">
        {" · taxas "}
        {formatCurrency(fees)}
      </Typography.Text>
    </span>
  );
}

export function TradeRowFields({
  name,
  index,
  canRemove,
  onRemove,
  onEnter,
}: {
  name: number;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onEnter: () => void;
}) {
  const handleEnter = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onEnter();
  };
  const label = (field: string) => `${field} da linha ${index + 1}`;
  const item = { noStyle: false, style: { marginBottom: 0 } };

  return (
    <div className={TRADE_ROW_GRID}>
      <Form.Item {...item} name={[name, "date"]} rules={required("Informe a data.")}>
        <DatePicker format="DD/MM/YYYY" aria-label={label("Data")} allowClear={false} className="w-full" />
      </Form.Item>
      <Form.Item {...item} name={[name, "accountType"]} rules={required("Selecione a conta.")}>
        <Select options={ACCOUNT_OPTIONS} aria-label={label("Conta")} />
      </Form.Item>
      <Form.Item {...item} name={[name, "asset"]} rules={required("Selecione o ativo.")}>
        <Select options={ASSET_OPTIONS} aria-label={label("Ativo")} />
      </Form.Item>
      <Form.Item {...item} name={[name, "contracts"]} rules={required("Informe os contratos.")}>
        <InputNumber
          min={1}
          precision={0}
          placeholder="Contr."
          aria-label={label("Contratos")}
          onKeyDown={handleEnter}
          autoFocus={index > 0}
          className="w-full"
        />
      </Form.Item>
      <Form.Item {...item} name={[name, "points"]} rules={required("Informe os pontos.")}>
        <InputNumber
          placeholder="Pontos"
          aria-label={label("Pontos")}
          onKeyDown={handleEnter}
          className="w-full"
        />
      </Form.Item>
      <RowPreview name={name} />
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remover linha ${index + 1}`}
      />
    </div>
  );
}
