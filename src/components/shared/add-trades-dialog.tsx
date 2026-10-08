"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { createTradesAction, type TradeRowInput } from "@/actions/trades";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AccountType } from "@/generated/prisma/enums";
import type { FormState } from "@/lib/validations";
import { TRADE_ROW_GRID, TradeRowFields, type TradeRow } from "./trade-row-fields";

const HEADERS = ["Data", "Conta", "Ativo", "Contratos", "Pontos", "Prévia", ""];

const newRow = ({ date, accountType, asset }: Pick<TradeRowInput, "date" | "accountType" | "asset">): TradeRow => ({
  key: crypto.randomUUID(),
  date,
  accountType,
  asset,
  contracts: "",
  points: "",
});

export function AddTradesDialog({
  today,
  defaultAccount,
}: {
  today: string;
  defaultAccount: AccountType;
}) {
  const initialRows = () => [newRow({ date: today, accountType: defaultAccount, asset: "WIN" })];
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TradeRow[]>(initialRows);
  const [state, setState] = useState<FormState>();
  const [isPending, startTransition] = useTransition();

  // Nova linha herda data, conta e ativo da anterior: agiliza lançar vários trades do mesmo dia.
  const addRow = () => setRows((current) => [...current, newRow(current[current.length - 1])]);

  const updateRow = (key: string, patch: Partial<TradeRowInput>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const removeRow = (key: string) => setRows((current) => current.filter((row) => row.key !== key));

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setRows(initialRows());
      setState(undefined);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const payload = rows.map(({ date, accountType, asset, contracts, points }) => ({
        date,
        accountType,
        asset,
        contracts,
        points,
      }));
      const result = await createTradesAction(payload);
      if (result?.error) return setState(result);
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus /> Adicionar trades
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Adicionar trades</DialogTitle>
            <DialogDescription>
              Uma linha por trade. Enter em Contratos/Pontos cria a próxima linha. Bruto e taxas B3
              são calculados ao salvar; o IRRF é apurado por dia.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <div className={`${TRADE_ROW_GRID} hidden text-xs font-medium text-muted-foreground sm:grid`}>
              {HEADERS.map((header) => (
                <span key={header}>{header}</span>
              ))}
            </div>
            {rows.map((row, index) => (
              <TradeRowFields
                key={row.key}
                row={row}
                index={index}
                autoFocus={index === rows.length - 1}
                canRemove={rows.length > 1}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => removeRow(row.key)}
                onEnter={addRow}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow} className="self-start">
              <Plus /> Nova linha
            </Button>
          </div>

          <FormMessage state={state} />

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <Save />}
              Salvar {rows.length} trade(s)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
