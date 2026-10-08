import { describe, expect, it } from "vitest";
import { b3Holidays, businessDaysOfMonth, isB3BusinessDay, monthRange, pendingBusinessDays } from "./b3-calendar";

describe("b3Holidays", () => {
  it("calcula os feriados móveis de 2026 a partir da Páscoa (05/04)", () => {
    const holidays = b3Holidays(2026);
    expect(holidays.has("2026-02-16")).toBe(true);
    expect(holidays.has("2026-02-17")).toBe(true);
    expect(holidays.has("2026-04-03")).toBe(true);
    expect(holidays.has("2026-06-04")).toBe(true);
  });

  it("inclui os feriados fixos", () => {
    expect(b3Holidays(2026).has("2026-10-12")).toBe(true);
    expect(b3Holidays(2026).has("2026-12-31")).toBe(true);
  });
});

describe("isB3BusinessDay", () => {
  it("rejeita fins de semana e feriados", () => {
    expect(isB3BusinessDay("2026-10-10")).toBe(false);
    expect(isB3BusinessDay("2026-10-11")).toBe(false);
    expect(isB3BusinessDay("2026-10-12")).toBe(false);
  });

  it("aceita dias de pregão", () => {
    expect(isB3BusinessDay("2026-10-08")).toBe(true);
  });
});

describe("businessDaysOfMonth", () => {
  it("outubro/2026 tem 21 pregões", () => {
    const days = businessDaysOfMonth(2026, 10);
    expect(days).toHaveLength(21);
    expect(days[0]).toBe("2026-10-01");
    expect(days.at(-1)).toBe("2026-10-30");
    expect(days).not.toContain("2026-10-12");
  });

  it("fevereiro/2026 desconta o Carnaval", () => {
    expect(businessDaysOfMonth(2026, 2)).toHaveLength(18);
  });
});

describe("pendingBusinessDays", () => {
  it("lista os pregões de hoje até o fim do mês que ainda não têm resultado", () => {
    const pending = pendingBusinessDays("2026-10-08", new Set(["2026-10-08"]));
    expect(pending[0]).toBe("2026-10-09");
    expect(pending).toHaveLength(15);
  });

  it("inclui hoje quando ainda não há trades no dia", () => {
    expect(pendingBusinessDays("2026-10-08", new Set())[0]).toBe("2026-10-08");
  });

  it("respeita o período filtrado", () => {
    expect(pendingBusinessDays("2026-10-08", new Set(), { to: "2026-10-09" })).toEqual(["2026-10-08", "2026-10-09"]);
    expect(pendingBusinessDays("2026-10-08", new Set(), { to: "2026-10-01" })).toEqual([]);
  });
});

describe("monthRange", () => {
  it("retorna o primeiro e o último dia do mês", () => {
    expect(monthRange("2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2026-10-08")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });
});
