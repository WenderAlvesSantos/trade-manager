"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createTradeAction } from "@/actions/trades";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ASSETS = [
  { value: "WIN", label: "WIN (Mini Índice)" },
  { value: "WDO", label: "WDO (Mini Dólar)" },
];

export function TradeForm({ today }: { today: string }) {
  const [state, formAction, isPending] = useActionState(createTradeAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo trade</CardTitle>
        <CardDescription>
          Bruto, taxas B3, IRRF (1%) e líquido são calculados automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" defaultValue={today} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="asset">Ativo</Label>
            <Select name="asset" defaultValue="WIN" items={ASSETS}>
              <SelectTrigger id="asset" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSETS.map((asset) => (
                  <SelectItem key={asset.value} value={asset.value}>
                    {asset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contracts">Contratos</Label>
            <Input id="contracts" name="contracts" type="number" min={1} step={1} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="points">Pontos</Label>
            <Input id="points" name="points" type="number" step="any" placeholder="Ex.: 150 ou -80" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Adicionar
          </Button>
        </form>
        <div className="mt-3">
          <FormMessage state={state} />
        </div>
      </CardContent>
    </Card>
  );
}
