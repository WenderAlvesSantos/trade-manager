import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { userLicense } from "@/lib/license-guard";

// Fonte única do userId em Server Components e Server Actions: nunca confiar em ids vindos do cliente.
// Sem licença da Megan vigente, o usuário só vê a tela de licença.
export async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const license = await userLicense(userId);
  if (!license?.licenseOk) redirect("/licenca");
  return userId;
}
