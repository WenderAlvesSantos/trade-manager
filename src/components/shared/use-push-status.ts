"use client";

import { useCallback, useEffect, useState } from "react";
import { disablePush, enablePush, getPushStatus, type PushStatus } from "@/lib/push-client";

// Estado do Web Push neste navegador; `null` enquanto ainda não foi lido no cliente.
export function usePushStatus() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPushStatus().then(setStatus);
  }, []);

  const run = useCallback(async (action: () => Promise<PushStatus>) => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await action());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar os avisos.");
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status,
    busy,
    error,
    enable: useCallback(() => run(enablePush), [run]),
    disable: useCallback(() => run(disablePush), [run]),
  };
}
