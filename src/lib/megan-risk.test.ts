import { describe, expect, it } from "vitest";
import { bankrollStatus } from "@/lib/bankroll-sizing";
import {
  applyMeganDefaults,
  bankrollSyncSchema,
  MEGAN_BATCH_MAX,
  MEGAN_WIN_RISK,
  meganBankrollReply,
  meganDefaultsBatchSchema,
  meganRiskRow,
  meganRiskRows,
} from "@/lib/megan-risk";
import { riskSettingsSchema } from "@/lib/validations";

const config = { ...MEGAN_WIN_RISK, asset: "WIN" as const, bankrollStartDate: "2026-11-02", levelStartDate: "2026-11-02" };

describe("configuração da Megan", () => {
  it("passa na validação da tela de configuração", () => {
    expect(riskSettingsSchema.safeParse({ ...MEGAN_WIN_RISK, bankrollStartDate: "2026-11-02" }).success).toBe(true);
  });

  it("conta nova: WIN no Real e no Simulador, banca ainda não informada, até 150 contratos", () => {
    const rows = meganRiskRows("u1", "2026-11-02");
    expect(rows.map((row) => row.accountType)).toEqual(["REAL", "SIMULADOR"]);
    expect(rows.every((row) => row.asset === "WIN" && row.initialBankroll === 0 && row.maxContracts === 150)).toBe(true);
    expect(rows[0].bankrollStartDate.toISOString().slice(0, 10)).toBe("2026-11-02");
    expect(meganRiskRow("u1", "REAL", "2026-11-02", 5000).initialBankroll).toBe(5000);
  });
});

describe("sugestão para a Megan", () => {
  it("dia de stop custa R$ 62,88 por contrato; R$ 10.000 com folga de 3 stops = 12 contratos", () => {
    const reply = meganBankrollReply(config, bankrollStatus({ ...config, initialBankroll: 10_000 }, 10_000));
    expect(reply).toMatchObject({ configured: true, bankroll: 10_000, stopCostPerContract: 62.88, suggestedContracts: 12, maxContracts: 150 });
  });

  it("sem banca informada não sugere nada", () => {
    expect(meganBankrollReply(config, bankrollStatus(config, 0))).toMatchObject({ configured: false, suggestedContracts: 0 });
  });

  it("nunca passa do máximo de 150", () => {
    const rico = { ...config, contracts: 150, initialBankroll: 10_000_000 };
    expect(meganBankrollReply(rico, bankrollStatus(rico, 10_000_000)).suggestedContracts).toBe(150);
  });

  it("contratos com que a Megan iniciou: inteiro a partir de 1", () => {
    expect(bankrollSyncSchema.parse({ email: "ana@x.com", accountType: "REAL", contracts: 12 }).contracts).toBe(12);
    expect(bankrollSyncSchema.safeParse({ email: "ana@x.com", accountType: "REAL", contracts: 0 }).success).toBe(false);
    expect(bankrollSyncSchema.safeParse({ email: "ana@x.com", accountType: "REAL", contracts: 2.5 }).success).toBe(false);
  });

  it("sincronização exige conta válida e banca positiva (sem banca = só consulta)", () => {
    expect(bankrollSyncSchema.parse({ email: " Ana@X.com ", accountType: "REAL" })).toEqual({ email: "ana@x.com", accountType: "REAL" });
    expect(bankrollSyncSchema.safeParse({ email: "ana@x.com", accountType: "REAL", initialBankroll: 0 }).success).toBe(false);
    expect(bankrollSyncSchema.safeParse({ email: "ana@x.com", accountType: "DEMO" }).success).toBe(false);
  });
});

describe("clientes antigos", () => {
  it("cria só onde falta, separa quem já tinha e quem não tem conta", async () => {
    const usuarios: Record<string, string> = { "nova@x.com": "u1", "antiga@x.com": "u2" };
    const criadas: Record<string, number> = { u1: 2, u2: 0 };
    const chamadas: string[] = [];
    const r = await applyMeganDefaults(["nova@x.com", "antiga@x.com", "fora@x.com", "nova@x.com"], {
      findUserId: async (email) => usuarios[email] ?? null,
      ensure: async (userId) => {
        chamadas.push(userId);
        return criadas[userId];
      },
    });
    expect(r).toEqual({ aplicados: ["nova@x.com"], jaTinham: ["antiga@x.com"], semConta: ["fora@x.com"] });
    expect(chamadas).toEqual(["u1", "u2"]);
  });

  it("lote de no máximo 50 e-mails válidos", () => {
    const emails = (n: number) => Array.from({ length: n }, (_, i) => `c${i}@x.com`);
    expect(meganDefaultsBatchSchema.safeParse({ emails: emails(MEGAN_BATCH_MAX) }).success).toBe(true);
    expect(meganDefaultsBatchSchema.safeParse({ emails: emails(MEGAN_BATCH_MAX + 1) }).success).toBe(false);
    expect(meganDefaultsBatchSchema.safeParse({ emails: ["sem-arroba"] }).success).toBe(false);
  });
});
