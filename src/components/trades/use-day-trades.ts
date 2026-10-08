"use client";

import { useEffect, useState } from "react";
import type { AccountType, Asset } from "@/generated/prisma/enums";
import type { DayTrade } from "@/lib/trades";

type DayTradesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; trades: DayTrade[] };

async function fetchDayTrades(day: string, account: AccountType | undefined, asset: Asset | undefined, signal: AbortSignal) {
  const params = new URLSearchParams({ dia: day });
  if (account) params.set("conta", account);
  if (asset) params.set("ativo", asset);
  const response = await fetch(`/api/trades?${params}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar os trades do dia.");
  return (await response.json()) as DayTrade[];
}

// Busca uma vez por montagem; para recarregar, o componente pai troca a key.
export function useDayTrades(day: string, account: AccountType | undefined, asset: Asset | undefined): DayTradesState {
  const [state, setState] = useState<DayTradesState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetchDayTrades(day, account, asset, controller.signal)
      .then((trades) => setState({ status: "ready", trades }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ status: "error", message: error.message });
      });
    return () => controller.abort();
  }, [day, account, asset]);

  return state;
}
