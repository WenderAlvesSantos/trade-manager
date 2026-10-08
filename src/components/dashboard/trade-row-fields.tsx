"use client";

import { Trash2 } from "lucide-react";
import type { TradeRowInput } from "@/actions/trades";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Asset } from "@/generated/prisma/enums";
import { formatCurrency, resultColor } from "@/lib/format";
import { calculateTradeResult } from "@/lib/trade-calculations";
import { ACCOUNT_OPTIONS } from "@/lib/trade-filters";

export type TradeRow = TradeRowInput & { key: string };

export const TRADE_ROW_GRID =
  "grid grid-cols-2 gap-2 sm:grid-cols-[9.5rem_8rem_7rem_6rem_7rem_1fr_2rem] sm:items-center";

const ASSET_OPTIONS = [
  { value: "WIN", label: "WIN" },
  { value: "WDO", label: "WDO" },
];

function previewResult(row: TradeRow) {
  const contracts = Number(row.contracts);
  const points = Number(row.points);
  if (!row.contracts || !row.points || !Number.isInteger(contracts) || contracts < 1 || Number.isNaN(points)) {
    return null;
  }
  return calculateTradeResult({ asset: row.asset as Asset, contracts, points });
}

export function TradeRowFields({
  row,
  index,
  autoFocus,
  canRemove,
  onChange,
  onRemove,
  onEnter,
}: {
  row: TradeRow;
  index: number;
  autoFocus: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<TradeRowInput>) => void;
  onRemove: () => void;
  onEnter: () => void;
}) {
  const preview = previewResult(row);
  const label = (field: string) => `${field} da linha ${index + 1}`;
  const handleEnter = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onEnter();
  };

  return (
    <div className={`${TRADE_ROW_GRID} rounded-lg border p-2 sm:border-0 sm:p-0`}>
      <Input
        type="date"
        aria-label={label("Data")}
        value={row.date}
        onChange={(e) => onChange({ date: e.target.value })}
        required
      />
      <SimpleSelect
        ariaLabel={label("Conta")}
        value={row.accountType}
        onChange={(accountType) => onChange({ accountType })}
        options={ACCOUNT_OPTIONS}
      />
      <SimpleSelect
        ariaLabel={label("Ativo")}
        value={row.asset}
        onChange={(asset) => onChange({ asset })}
        options={ASSET_OPTIONS}
      />
      <Input
        type="number"
        min={1}
        step={1}
        placeholder="Contr."
        aria-label={label("Contratos")}
        value={row.contracts}
        onChange={(e) => onChange({ contracts: e.target.value })}
        onKeyDown={handleEnter}
        autoFocus={autoFocus}
        required
      />
      <Input
        type="number"
        step="any"
        placeholder="Pontos"
        aria-label={label("Pontos")}
        value={row.points}
        onChange={(e) => onChange({ points: e.target.value })}
        onKeyDown={handleEnter}
        required
      />
      <span className="text-xs text-muted-foreground">
        {preview ? (
          <>
            <span className={resultColor(preview.grossResult)}>{formatCurrency(preview.grossResult)}</span>
            {" · taxas "}
            {formatCurrency(preview.fees)}
          </>
        ) : (
          "—"
        )}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remover linha ${index + 1}`}
        className="justify-self-end text-muted-foreground hover:text-red-600"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
