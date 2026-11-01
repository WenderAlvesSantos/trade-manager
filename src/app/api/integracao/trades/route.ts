import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { pushNewAlerts } from "@/lib/alert-push";
import { integrationTradeSchema, launchTrade } from "@/lib/integration-trades";
import { integrationAuthError } from "@/lib/integration-users";
import { prisma } from "@/lib/prisma";
import { firstIssueMessage } from "@/lib/validations";

// POST /api/integracao/trades — chamado pelo site da Megan a cada trade fechado no ao vivo.
// O usuário é identificado pelo e-mail; o mesmo externalId reenviado não duplica o trade.
export async function POST(request: Request) {
  const negado = integrationAuthError(request);
  if (negado) return negado;

  const body = await request.json().catch(() => null);
  const parsed = integrationTradeSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });

  const result = await launchTrade(parsed.data, {
    findUserId: async (email) => (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id ?? null,
    createTrade: async (data) => {
      try {
        await prisma.trade.create({ data });
        return true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
        throw error;
      }
    },
  });

  if (result.status === "sem_usuario") return Response.json({ status: result.status }, { status: 404 });
  if (result.status === "criado") {
    revalidatePath("/", "layout");
    after(() => pushNewAlerts(result.userId));
  }
  return Response.json({ status: result.status }, { status: result.status === "criado" ? 201 : 200 });
}
