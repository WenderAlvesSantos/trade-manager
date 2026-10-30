import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { integrationUserSchema, isIntegrationAuthorized, provisionUser } from "@/lib/integration-users";
import { generatePassword } from "@/lib/password";

describe("generatePassword", () => {
  it("gera 8 caracteres sem letras/números ambíguos", () => {
    for (let i = 0; i < 200; i++) {
      const password = generatePassword();
      expect(password).toMatch(/^[A-HJKMNP-Za-hjkmnp-z2-9]{8}$/);
    }
  });
});

describe("isIntegrationAuthorized", () => {
  it("aceita só o Bearer com a chave exata", () => {
    expect(isIntegrationAuthorized("Bearer chave-secreta", "chave-secreta")).toBe(true);
    expect(isIntegrationAuthorized("Bearer outra", "chave-secreta")).toBe(false);
    expect(isIntegrationAuthorized("chave-secreta", "chave-secreta")).toBe(false);
    expect(isIntegrationAuthorized(null, "chave-secreta")).toBe(false);
  });
});

describe("provisionUser", () => {
  it("cria a conta com hash bcrypt e devolve a senha em texto uma vez", async () => {
    const saved: { email: string; hash: string }[] = [];
    const result = await provisionUser("maria@exemplo.com", async (email, hash) => {
      saved.push({ email, hash });
      return true;
    });
    expect(result.status).toBe("criado");
    if (result.status !== "criado") return;
    expect(saved).toHaveLength(1);
    expect(saved[0].hash).not.toBe(result.password);
    expect(await bcrypt.compare(result.password, saved[0].hash)).toBe(true);
  });

  it("conta existente não recebe senha nova", async () => {
    const result = await provisionUser("maria@exemplo.com", async () => false);
    expect(result).toEqual({ status: "existente" });
  });
});

describe("integrationUserSchema", () => {
  it("normaliza o e-mail e recusa inválido", () => {
    expect(integrationUserSchema.parse({ email: " Maria@Exemplo.com " }).email).toBe("maria@exemplo.com");
    expect(integrationUserSchema.safeParse({ email: "sem-arroba" }).success).toBe(false);
  });
});
