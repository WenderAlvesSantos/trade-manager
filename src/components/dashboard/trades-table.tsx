import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Trade } from "@/generated/prisma/client";
import { formatCurrency, formatDate, resultColor } from "@/lib/format";
import { DeleteTradeButton } from "./delete-trade-button";

const COLUMNS = ["Data", "Ativo", "Contratos", "Pontos", "Bruto", "Taxas", "IRRF", "Líquido", ""];

function TradeRow({ trade }: { trade: Trade }) {
  return (
    <TableRow>
      <TableCell>{formatDate(trade.date)}</TableCell>
      <TableCell className="font-medium">{trade.asset}</TableCell>
      <TableCell className="text-right">{trade.contracts}</TableCell>
      <TableCell className={`text-right ${resultColor(trade.points)}`}>
        {trade.points.toLocaleString("pt-BR")}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(trade.grossResult)}</TableCell>
      <TableCell className="text-right">{formatCurrency(trade.fees)}</TableCell>
      <TableCell className="text-right">{formatCurrency(trade.taxes)}</TableCell>
      <TableCell className={`text-right font-semibold ${resultColor(trade.netResult)}`}>
        {formatCurrency(trade.netResult)}
      </TableCell>
      <TableCell className="text-right">
        <DeleteTradeButton tradeId={trade.id} />
      </TableCell>
    </TableRow>
  );
}

export function TradesTable({ trades }: { trades: Trade[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de trades</CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum trade registrado ainda. Adicione o primeiro acima.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column, index) => (
                  <TableHead key={column || index} className={index > 1 ? "text-right" : ""}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
