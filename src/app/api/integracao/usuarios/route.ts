import { Prisma } from "@/generated/prisma/client";
import { todayInSaoPaulo } from "@/lib/b3-calendar";
import { integrationAuthError, integrationUserSchema, provisionUser } from "@/lib/integration-users";
import { meganRiskRows } from "@/lib/megan-risk";
import { prisma } from "@/lib/prisma";

// POST /api/integracao/usuarios — chamado pelo site da Megan no cadastro do teste e na compra.
// Cria a conta com senha aleatória (devolvida uma única vez) e o gerenciamento da Megan no WIN Real e Simulador;
// conta existente não é alterada.
export async function POST(request: Request) {
  const negado = integrationAuthError(request);
  if (negado) return negado;

  const body = await request.json().catch(() => null);
  const parsed = integrationUserSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "E-mail inválido." }, { status: 400 });

  const result = await provisionUser(parsed.data.email, async (email, password) => {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email, password }, select: { id: true } });
        await tx.riskSettings.createMany({ data: meganRiskRows(user.id, todayInSaoPaulo()) });
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
  });
  return Response.json(result, { status: result.status === "criado" ? 201 : 200 });
}
