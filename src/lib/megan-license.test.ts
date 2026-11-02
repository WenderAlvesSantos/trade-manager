import { describe, expect, it } from "vitest";
import {
  LICENSE_TTL_MS,
  LICENSE_UNAVAILABLE,
  isLicenseFresh,
  offlineLicense,
  parseSiteReply,
  type LicenseCache,
} from "@/lib/megan-license";

const now = new Date("2026-11-10T13:00:00Z");
const ok: LicenseCache = {
  licenseOk: true,
  licensePlan: "trial",
  licenseUntil: new Date("2026-11-19T21:30:00Z"),
  licenseMessage: "OK",
  licenseCheckedAt: new Date(now.getTime() - 60_000),
};

describe("isLicenseFresh", () => {
  it("liberado e consultado há pouco dispensa nova consulta", () => {
    expect(isLicenseFresh(ok, now)).toBe(true);
  });

  it("consulta de novo depois de 10 min, ao vencer, se bloqueado ou nunca consultado", () => {
    expect(isLicenseFresh({ ...ok, licenseCheckedAt: new Date(now.getTime() - LICENSE_TTL_MS) }, now)).toBe(false);
    expect(isLicenseFresh({ ...ok, licenseUntil: new Date(now.getTime() - 1) }, now)).toBe(false);
    expect(isLicenseFresh({ ...ok, licenseOk: false }, now)).toBe(false);
    expect(isLicenseFresh({ ...ok, licenseCheckedAt: null }, now)).toBe(false);
  });

  it("licença sem vencimento segue valendo dentro dos 10 min", () => {
    expect(isLicenseFresh({ ...ok, licensePlan: "licenca", licenseUntil: null }, now)).toBe(true);
  });
});

describe("offlineLicense", () => {
  it("site fora do ar mantém quem estava liberado até o vencimento", () => {
    expect(offlineLicense(ok, now)).toEqual(ok);
  });

  it("bloqueia quem venceu, estava bloqueado ou nunca foi consultado", () => {
    const vencido = offlineLicense({ ...ok, licenseUntil: new Date(now.getTime() - 1) }, now);
    expect(vencido).toMatchObject({ licenseOk: false, licenseMessage: LICENSE_UNAVAILABLE });
    const nunca = offlineLicense({ licenseOk: false, licensePlan: null, licenseUntil: null, licenseMessage: null }, now);
    expect(nunca).toMatchObject({ licenseOk: false, licenseMessage: LICENSE_UNAVAILABLE });
  });
});

describe("parseSiteReply", () => {
  it("converte a resposta do /api/acesso", () => {
    const r = parseSiteReply({ ok: false, plano: "anual", venceEm: "2026-11-01T00:00:00.000Z", mensagem: "Renove." });
    expect(r).toEqual({
      licenseOk: false,
      licensePlan: "anual",
      licenseUntil: new Date("2026-11-01T00:00:00.000Z"),
      licenseMessage: "Renove.",
    });
  });

  it("e-mail sem cadastro vem com plano vazio; resposta fora do formato é ignorada", () => {
    expect(parseSiteReply({ ok: false, plano: "", venceEm: null, mensagem: "Não autorizado." })?.licensePlan).toBeNull();
    expect(parseSiteReply({ erro: "Não autorizado." })).toBeNull();
    expect(parseSiteReply(null)).toBeNull();
  });
});
