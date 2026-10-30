import { Prisma } from "@/generated/prisma/client";
import { integrationUserSchema, isIntegrationAuthorized, provisionUser } from "@/lib/integration-users";
import { prisma } from "@/lib/prisma";

// POST /api/integracao/usuarios — chamado pelo site da Megan no cadastro do teste.
// Cria a conta com senha aleatória e devolve a senha uma única vez; conta existente não é alterada.
export async function POST(request: Request) {
  const secret = process.env.MEGAN_INTEGRATION_KEY?.trim();
  if (!secret) return Response.json({ error: "Integração não configurada." }, { status: 503 });
  if (!isIntegrationAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = integrationUserSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "E-mail inválido." }, { status: 400 });

  const result = await provisionUser(parsed.data.email, async (email, password) => {
    try {
      await prisma.user.create({ data: { email, password } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  });
  return Response.json(result, { status: result.status === "criado" ? 201 : 200 });
}
