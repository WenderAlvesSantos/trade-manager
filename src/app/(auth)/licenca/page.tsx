import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LicenseBlocked } from "@/components/auth/license-blocked";
import { checkUserLicense } from "@/lib/license-guard";
import { purchaseUrl } from "@/lib/megan-license";

export const metadata: Metadata = { title: "Licença | Megan" };

export default async function LicensePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const license = await checkUserLicense(userId);
  if (license?.licenseOk) redirect("/");

  return (
    <LicenseBlocked
      email={license?.email ?? session.user?.email ?? ""}
      message={license?.licenseMessage ?? "Conta não encontrada."}
      renew={license?.licensePlan === "anual"}
      purchaseUrl={purchaseUrl()}
    />
  );
}
