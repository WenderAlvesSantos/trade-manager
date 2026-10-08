"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { AccountType } from "@/generated/prisma/enums";
import { ACCOUNT_OPTIONS, filtersToQueryString, type TradeFilters } from "@/lib/trade-filters";

const ALL_ACCOUNTS = "AMBOS";

export function FilterBar({ initialFilters }: { initialFilters: TradeFilters }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<TradeFilters>(initialFilters);

  function applyFilters(next: TradeFilters) {
    setFilters(next);
    startTransition(() => router.replace(`/${filtersToQueryString(next)}`, { scroll: false }));
  }

  const hasFilters = Boolean(filters.account || filters.from || filters.to);

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label>Conta</Label>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[filters.account ?? ALL_ACCOUNTS]}
            onValueChange={([value]) => {
              if (!value) return;
              const account = value === ALL_ACCOUNTS ? undefined : (value as AccountType);
              applyFilters({ ...filters, account });
            }}
          >
            {ACCOUNT_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
            <ToggleGroupItem value={ALL_ACCOUNTS}>Ambos</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-from" className="flex items-center gap-1">
            <CalendarRange className="size-4" /> Período
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="filter-from"
              type="date"
              aria-label="Data início"
              value={filters.from ?? ""}
              max={filters.to}
              onChange={(e) => applyFilters({ ...filters, from: e.target.value || undefined })}
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              aria-label="Data fim"
              value={filters.to ?? ""}
              min={filters.from}
              onChange={(e) => applyFilters({ ...filters, to: e.target.value || undefined })}
            />
          </div>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => applyFilters({})}>
            <X /> Limpar filtros
          </Button>
        )}
        {isPending && <Loader2 className="mb-2 size-4 animate-spin text-muted-foreground" />}
      </CardContent>
    </Card>
  );
}
