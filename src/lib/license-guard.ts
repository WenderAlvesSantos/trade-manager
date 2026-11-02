import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  fetchMeganLicense,
  isLicenseFresh,
  licenseCheckDisabled,
  offlineLicense,
  type LicenseCache,
} from "@/lib/megan-license";

export type UserLicense = LicenseCache & { email: string };

const LICENSE_SELECT = {
  email: true,
  licenseOk: true,
  licensePlan: true,
  licenseUntil: true,
  licenseMessage: true,
  licenseCheckedAt: true,
} as const;

/** Licença atual do usuário: usa o cache de 10 min ou consulta o site da Megan e grava o resultado. */
export async function checkUserLicense(userId: string): Promise<UserLicense | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: LICENSE_SELECT });
  if (!user) return null;
  if (licenseCheckDisabled()) return { ...user, licenseOk: true };

  const now = new Date();
  if (isLicenseFresh(user, now)) return user;

  const fetched = await fetchMeganLicense(user.email);
  if (!fetched) return { ...user, ...offlineLicense(user, now) };

  const data = { ...fetched, licenseCheckedAt: now };
  await prisma.user.update({ where: { id: userId }, data });
  return { ...user, ...data };
}

/** Mesma consulta deduplicada dentro de uma requisição (layout, página e actions chamam várias vezes). */
export const userLicense = cache(checkUserLicense);
