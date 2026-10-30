import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { generatePassword, hashPassword } from "@/lib/password";

export const integrationUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.")),
});

export type ProvisionResult = { status: "criado"; password: string } | { status: "existente" };

/** Deve devolver false quando o e-mail já existe (índice único), sem alterar a conta existente. */
export type CreateUser = (email: string, passwordHash: string) => Promise<boolean>;

export function isIntegrationAuthorized(authorization: string | null, secret: string) {
  if (!authorization) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}

export async function provisionUser(email: string, createUser: CreateUser): Promise<ProvisionResult> {
  const password = generatePassword();
  const created = await createUser(email, await hashPassword(password));
  return created ? { status: "criado", password } : { status: "existente" };
}
