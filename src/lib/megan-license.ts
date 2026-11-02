import { z } from "zod";

export const LICENSE_TTL_MS = 10 * 60_000;
export const DEFAULT_PURCHASE_URL = "https://megan-n18.origem.tech/comprar";
export const LICENSE_UNAVAILABLE =
  "Não foi possível verificar sua licença da Megan agora. Tente novamente em instantes.";

export type LicenseFields = {
  licenseOk: boolean;
  licensePlan: string | null;
  licenseUntil: Date | null;
  licenseMessage: string | null;
};

export type LicenseCache = LicenseFields & { licenseCheckedAt: Date | null };

const siteReplySchema = z.object({
  ok: z.boolean(),
  plano: z.string(),
  venceEm: z.string().nullable(),
  mensagem: z.string(),
});

export function purchaseUrl() {
  return process.env.MEGAN_COMPRA_URL?.trim() || DEFAULT_PURCHASE_URL;
}

/** Só em dev/test: MEGAN_LICENSE_CHECK="off" libera sem consultar o site. Em produção é sempre exigida. */
export function licenseCheckDisabled() {
  return process.env.NODE_ENV !== "production" && process.env.MEGAN_LICENSE_CHECK === "off";
}

const notExpired = (until: Date | null, now: Date) => until === null || now.getTime() < until.getTime();

/** O cache dispensa nova consulta: liberado, consultado há menos de 10 min e sem vencer nesse meio-tempo. */
export function isLicenseFresh(c: LicenseCache, now: Date) {
  if (!c.licenseOk || !c.licenseCheckedAt) return false;
  return now.getTime() - c.licenseCheckedAt.getTime() < LICENSE_TTL_MS && notExpired(c.licenseUntil, now);
}

/** Site da Megan fora do ar: quem estava liberado continua até o vencimento conhecido; os demais ficam bloqueados. */
export function offlineLicense(c: LicenseFields, now: Date): LicenseFields {
  if (c.licenseOk && notExpired(c.licenseUntil, now)) return c;
  return { ...c, licenseOk: false, licenseMessage: LICENSE_UNAVAILABLE };
}

export function parseSiteReply(body: unknown): LicenseFields | null {
  const r = siteReplySchema.safeParse(body);
  if (!r.success) return null;
  return {
    licenseOk: r.data.ok,
    licensePlan: r.data.plano || null,
    licenseUntil: r.data.venceEm ? new Date(r.data.venceEm) : null,
    licenseMessage: r.data.mensagem,
  };
}

/** Consulta o site da Megan; null quando não configurado ou indisponível. */
export async function fetchMeganLicense(email: string): Promise<LicenseFields | null> {
  const base = process.env.MEGAN_SITE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.MEGAN_INTEGRATION_KEY?.trim();
  if (!base || !key) return null;
  try {
    const res = await fetch(`${base}/api/acesso`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ email }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    return parseSiteReply(await res.json());
  } catch (error) {
    console.error("[licenca] site da Megan indisponível", error);
    return null;
  }
}
