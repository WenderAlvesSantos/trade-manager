"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatPercent, resultColor } from "@/lib/format";
import type { DaySummary } from "@/lib/trade-aggregations";
import { DayTradesDetail } from "./day-trades-detail";

const DAY_COLUMNS = ["Data", "Trades", "Win Rate", "Pontos", "Bruto", "Taxas", "Lucro Op.", "IRRF", "Líquido"];

function DayPoints({ pointsByAsset }: Pick<DaySummary, "pointsByAsset">) {
  const entries = Object.entries(pointsByAsset);
  const showAsset = entries.length > 1;
  return (
    <span className="flex flex-col items-end">
      {entries.map(([asset, points]) => (
        <span key={asset} className={resultColor(points)}>
          {points.toLocaleString("pt-BR")}
          {showAsset && <span className="ml-1 text-xs text-muted-foreground">{asset}</span>}
        </span>
      ))}
    </span>
  );
}

function DayRow({ day, isOpen, onToggle }: { day: DaySummary; isOpen: boolean; onToggle: () => void }) {
  return (
    <TableRow
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onToggle();
      }}
      tabIndex={0}
      aria-expanded={isOpen}
      className="cursor-pointer"
    >
      <TableCell className="font-medium">
        <span className="flex items-center gap-1">
          <ChevronRight className={`size-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
          {formatDate(day.day)}
        </span>
      </TableCell>
      <TableCell className="text-right">{day.tradeCount}</TableCell>
      <TableCell className="text-right">{formatPercent(day.winRate)}</TableCell>
      <TableCell className="text-right">
        <DayPoints pointsByAsset={day.pointsByAsset} />
      </TableCell>
      <TableCell className="text-right">{formatCurrency(day.grossResult)}</TableCell>
      <TableCell className="text-right">{formatCurrency(day.fees)}</TableCell>
      <TableCell className={`text-right ${resultColor(day.operatingProfit)}`}>
        {formatCurrency(day.operatingProfit)}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(day.irrf)}</TableCell>
      <TableCell className={`text-right font-semibold ${resultColor(day.netResult)}`}>
        {formatCurrency(day.netResult)}
      </TableCell>
    </TableRow>
  );
}

export function DailyTradesTable({ days }: { days: DaySummary[] }) {
  const [openDays, setOpenDays] = useState<Set<string>>(new Set());

  function toggleDay(day: string) {
    setOpenDays((current) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico diário</CardTitle>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum trade encontrado para os filtros selecionados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {DAY_COLUMNS.map((column, index) => (
                  <TableHead key={column} className={index > 0 ? "text-right" : ""}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day) => {
                const isOpen = openDays.has(day.day);
                return [
                  <DayRow key={day.day} day={day} isOpen={isOpen} onToggle={() => toggleDay(day.day)} />,
                  isOpen && (
                    <TableRow key={`${day.day}-detail`} className="hover:bg-transparent">
                      <TableCell colSpan={DAY_COLUMNS.length} className="bg-muted/40 p-0">
                        <DayTradesDetail trades={day.trades} />
                      </TableCell>
                    </TableRow>
                  ),
                ];
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
