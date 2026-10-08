"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Avisa os outros componentes da mesma aba (o evento "storage" só chega às outras abas).
const LOCAL_EVENT = "megan:stored-state";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_EVENT, onChange);
  };
}

// Estado salvo no localStorage. No servidor e no primeiro render usa `fallback` (sem divergência de hidratação).
// `fallback` e `parse` precisam ser estáveis; `parse` devolve null para valores inválidos.
export function useStoredState<T>(key: string, fallback: T, parse: (raw: unknown) => T | null): [T, (next: T) => void] {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(key), () => null);

  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return parse(JSON.parse(raw)) ?? fallback;
    } catch {
      return fallback;
    }
  }, [raw, fallback, parse]);

  const setValue = useCallback(
    (next: T) => {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(LOCAL_EVENT));
    },
    [key],
  );

  return [value, setValue];
}
