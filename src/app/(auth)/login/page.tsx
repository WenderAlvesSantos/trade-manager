import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { purchaseUrl } from "@/lib/megan-license";

export const metadata: Metadata = { title: "Entrar | Megan" };

export default function LoginPage() {
  return <AuthForm purchaseUrl={purchaseUrl()} />;
}
