import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Trade } from "@/generated/prisma/client";
import { formatCurrency, resultColor } from "@/lib/format";
import { ACCOUNT_LABEL } from "@/lib/trade-filters";
import { DeleteTradeButton } from "./delete-trade-button";

const TRADE_COLUMNS = ["Ativo", "Conta", "Contratos", "Pontos", "Bruto", "Taxas", ""];

export function DayTradesDetail({ trades }: { trades: Trade[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {TRADE_COLUMNS.map((column, index) => (
            <TableHead key={column || index} className={`pl-8 ${index > 1 ? "text-right" : ""}`}>
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id}>
            <TableCell className="pl-8 font-medium">{trade.asset}</TableCell>
            <TableCell className="pl-8">{ACCOUNT_LABEL[trade.accountType]}</TableCell>
            <TableCell className="text-right">{trade.contracts}</TableCell>
            <TableCell className={`text-right ${resultColor(trade.points)}`}>
              {trade.points.toLocaleString("pt-BR")}
            </TableCell>
            <TableCell className={`text-right ${resultColor(trade.grossResult)}`}>
              {formatCurrency(trade.grossResult)}
            </TableCell>
            <TableCell className="text-right">{formatCurrency(trade.fees)}</TableCell>
            <TableCell className="text-right">
              <DeleteTradeButton tradeId={trade.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
