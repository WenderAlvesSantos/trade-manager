import { describe, expect, it } from "vitest";
import { bankrollAlert, nearIncreaseAlert, stopAlert } from "./app-alert";
import { bankrollStatus } from "./bankroll-sizing";
import { TEST_RISK_CONFIG as config } from "./risk-test-config";

const context = { account: "REAL" as const, label: "WIN", asset: "WIN" as const, contracts: 1, increaseBuffer: 0 };

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

describe("nearIncreaseAlert", () => {
  it("pré-avisa quando 1 dia de meta libera o próximo nível", () => {
    const alert = nearIncreaseAlert(context, bankrollStatus(config, 1000), 1);
    expect(alert?.key).toBe("bankroll-near:REAL:WIN:1:2");
    expect(alert?.severity).toBe("info");
  });

  it("não pré-avisa com mais dias de meta ou quando já pode subir", () => {
    expect(nearIncreaseAlert(context, bankrollStatus(config, 1000), 2)).toBeNull();
    expect(nearIncreaseAlert(context, bankrollStatus(config, 1900), 1)).toBeNull();
  });
});
