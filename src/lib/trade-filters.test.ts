import { describe, expect, it } from "vitest";
import { filtersToQueryString, parseTradeFilters } from "./trade-filters";

describe("filtros de trades", () => {
  it("lê conta, ativo e período da URL e ignora valores inválidos", () => {
    expect(parseTradeFilters({ conta: "REAL", ativo: "WDO", de: "2026-10-01" })).toEqual({
      account: "REAL",
      asset: "WDO",
      from: "2026-10-01",
      to: undefined,
    });
    expect(parseTradeFilters({ ativo: "PETR4" }).asset).toBeUndefined();
  });

  it("monta a query string com o ativo", () => {
    expect(filtersToQueryString({ account: "SIMULADOR", asset: "WIN" }, 2)).toBe("?conta=SIMULADOR&ativo=WIN&pagina=2");
    expect(filtersToQueryString({})).toBe("");
  });
});
