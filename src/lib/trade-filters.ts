import { z } from "zod";
import type { AccountType } from "@/generated/prisma/enums";

export const ACCOUNT_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "SIMULADOR", label: "Simulador" },
  { value: "REAL", label: "Real" },
];

export const ACCOUNT_LABEL: Record<AccountType, string> = {
  SIMULADOR: "Simulador",
  REAL: "Real",
};

export type TradeFilters = {
  account?: AccountType;
  from?: string;
  to?: string;
};

// Parâmetros da URL: ?conta=REAL&de=2026-10-01&ate=2026-10-31. Valores inválidos são ignorados.
const filtersSchema = z.object({
  conta: z.enum(["SIMULADOR", "REAL"]).optional().catch(undefined),
  de: z.iso.date().optional().catch(undefined),
  ate: z.iso.date().optional().catch(undefined),
});

type SearchParams = Record<string, string | string[] | undefined>;

export function parseTradeFilters(searchParams: SearchParams): TradeFilters {
  const { conta, de, ate } = filtersSchema.parse(searchParams);
  return { account: conta, from: de, to: ate };
}

// ?pagina=N da listagem de Trades; ausente ou inválido = primeira página.
const pageSchema = z.object({ pagina: z.coerce.number().int().min(1).catch(1).default(1) });

export function parsePage(searchParams: SearchParams) {
  return pageSchema.parse(searchParams).pagina;
}

export function filtersToQueryString({ account, from, to }: TradeFilters, page?: number) {
  const params = new URLSearchParams();
  if (account) params.set("conta", account);
  if (from) params.set("de", from);
  if (to) params.set("ate", to);
  if (page && page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `?${query}` : "";
}
