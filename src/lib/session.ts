import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Fonte única do userId em Server Components e Server Actions: nunca confiar em ids vindos do cliente.
export async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  return userId;
}
