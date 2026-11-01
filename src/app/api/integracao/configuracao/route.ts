import { revalidatePath } from "next/cache";
import { todayInSaoPaulo } from "@/lib/b3-calendar";
import { integrationAuthError } from "@/lib/integration-users";
import { applyMeganDefaults, meganDefaultsBatchSchema } from "@/lib/megan-risk";
import { ensureMeganSettings } from "@/lib/megan-sync";
import { prisma } from "@/lib/prisma";
import { firstIssueMessage } from "@/lib/validations";

// POST /api/integracao/configuracao — /admin do site da Megan, em lotes de e-mails dos clientes.
// Cria a configuração da Megan (WIN Real + Simulador) só onde ainda não existe; nada é sobrescrito.
export async function POST(request: Request) {
  const negado = integrationAuthError(request);
  if (negado) return negado;

  const body = await request.json().catch(() => null);
  const parsed = meganDefaultsBatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });

  const today = todayInSaoPaulo();
  const result = await applyMeganDefaults(parsed.data.emails, {
    findUserId: async (email) => (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id ?? null,
    ensure: (userId) => ensureMeganSettings(userId, today),
  });
  if (result.aplicados.length > 0) revalidatePath("/", "layout");
  return Response.json(result);
}
