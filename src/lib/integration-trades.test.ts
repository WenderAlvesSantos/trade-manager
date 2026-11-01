import { describe, expect, it } from "vitest";
import { integrationTradeSchema, launchTrade, type TradeLaunchDeps } from "@/lib/integration-trades";

const BASE = {
  email: " Ana@X.com ",
  externalId: "a1b2c3d4e5f6a7b8",
  date: "2026-10-30",
  accountType: "REAL",
  asset: "WIN",
  contracts: 2,
  points: -110,
};

function banco(usuarios: Record<string, string>) {
  const trades: Parameters<TradeLaunchDeps["createTrade"]>[0][] = [];
  const deps: TradeLaunchDeps = {
    findUserId: async (email) => usuarios[email] ?? null,
    createTrade: async (data) => {
      if (trades.some((t) => t.userId === data.userId && t.externalId === data.externalId)) return false;
      trades.push(data);
      return true;
    },
  };
  return { deps, trades };
}

describe("integrationTradeSchema", () => {
  it("normaliza o e-mail e exige id externo, conta, ativo e contratos válidos", () => {
    expect(integrationTradeSchema.parse(BASE).email).toBe("ana@x.com");
    expect(integrationTradeSchema.safeParse({ ...BASE, externalId: "curto" }).success).toBe(false);
    expect(integrationTradeSchema.safeParse({ ...BASE, accountType: "DEMO" }).success).toBe(false);
    expect(integrationTradeSchema.safeParse({ ...BASE, contracts: 0 }).success).toBe(false);
  });
});

describe("launchTrade", () => {
  it("grava na conta do e-mail com resultado e custo calculados", async () => {
    const { deps, trades } = banco({ "ana@x.com": "u1" });
    const r = await launchTrade(integrationTradeSchema.parse(BASE), deps);
    expect(r).toEqual({ status: "criado", userId: "u1" });
    expect(trades[0]).toMatchObject({
      userId: "u1",
      externalId: "a1b2c3d4e5f6a7b8",
      accountType: "REAL",
      contracts: 2,
      points: -110,
      grossResult: -44,
      fees: 0.96,
    });
    expect(trades[0].date.toISOString().slice(0, 10)).toBe("2026-10-30");
  });

  it("reenvio do mesmo trade não duplica", async () => {
    const { deps, trades } = banco({ "ana@x.com": "u1" });
    const trade = integrationTradeSchema.parse(BASE);
    await launchTrade(trade, deps);
    expect(await launchTrade(trade, deps)).toEqual({ status: "duplicado", userId: "u1" });
    expect(trades).toHaveLength(1);
  });

  it("e-mail sem conta no gerenciador não grava nada", async () => {
    const { deps, trades } = banco({});
    expect(await launchTrade(integrationTradeSchema.parse(BASE), deps)).toEqual({ status: "sem_usuario" });
    expect(trades).toHaveLength(0);
  });
});
