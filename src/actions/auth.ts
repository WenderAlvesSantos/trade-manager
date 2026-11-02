"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { credentialsSchema, firstIssueMessage, type FormState } from "@/lib/validations";

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) return { error: "E-mail ou senha inválidos." };
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
