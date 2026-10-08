"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTradeAction } from "@/actions/trades";
import { Button } from "@/components/ui/button";

export function DeleteTradeButton({ tradeId }: { tradeId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Excluir este trade?")) return;
    startTransition(() => deleteTradeAction(tradeId));
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Excluir trade"
      className="text-muted-foreground hover:text-red-600"
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
