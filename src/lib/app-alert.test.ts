import { describe, expect, it } from "vitest";
import { bankrollAlert, stopAlert } from "./app-alert";
import { bankrollStatus } from "./bankroll-sizing";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

const context = { account: "REAL" as const, asset: "WIN" as const, contracts: 1 };

describe("stopAlert", () => {
  it("chave única por conta, ativo e dia", () => {
    expect(stopAlert("REAL", "WIN", "2026-10-08", -320, 250).key).toBe("stop:REAL:WIN:2026-10-08");
  });
});

describe("bankrollAlert", () => {
  it("não avisa quando a banca comporta os contratos atuais", () => {
    expect(bankrollAlert(context, bankrollStatus(config, 1000))).toBeNull();
  });

  it("avisa subida com chave por contratos atuais e sugeridos", () => {
    const alert = bankrollAlert(context, bankrollStatus(config, 1900));
    expect(alert?.key).toBe("bankroll:REAL:WIN:1:3");
    expect(alert?.severity).toBe("success");
  });

  it("avisa redução quando a banca não comporta os contratos atuais", () => {
    const alert = bankrollAlert({ ...context, contracts: 6 }, bankrollStatus({ ...config, contracts: 6 }, 1000));
    expect(alert?.severity).toBe("warning");
    expect(alert?.key).toBe("bankroll:REAL:WIN:6:1");
  });
});
