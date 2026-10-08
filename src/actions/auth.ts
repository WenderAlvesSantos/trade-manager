"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  credentialsSchema,
  firstIssueMessage,
  registerSchema,
  type FormState,
} from "@/lib/validations";

const BCRYPT_ROUNDS = 10;

async function signInWithCredentials(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw error;
  }
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  return signInWithCredentials(parsed.data.email, parsed.data.password);
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const { email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Já existe uma conta com este e-mail." };

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.create({ data: { email, password: hashedPassword } });

  return signInWithCredentials(email, password);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
