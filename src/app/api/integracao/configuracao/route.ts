import { revalidatePath } from "next/cache";
import { todayInSaoPaulo } from "@/lib/b3-calendar";
import { integrationAuthError } from "@/lib/integration-users";
import { applyMeganDefaults, meganDefaultsBatchSchema } from "@/lib/megan-risk";
import { applyMeganSettings, ensureMeganSettings } from "@/lib/megan-sync";
import { prisma } from "@/lib/prisma";
import { firstIssueMessage } from "@/lib/validations";

// POST /api/integracao/configuracao — /admin do site da Megan.
// Em lote: cria a configuração da Megan (WIN Real + Simulador) só onde ainda não existe.
// Com `sobrescrever` (botão de um cliente): aplica também sobre a existente, mantendo banca e contratos.
export async function POST(request: Request) {
  const negado = integrationAuthError(request);
  if (negado) return negado;

  const body = await request.json().catch(() => null);
  const parsed = meganDefaultsBatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });

  const today = todayInSaoPaulo();
  const { emails, sobrescrever } = parsed.data;
  const result = await applyMeganDefaults(emails, {
    findUserId: async (email) => (await prisma.user.findUnique({ where: { email }, select: { id: true } }))?.id ?? null,
    ensure: (userId) => (sobrescrever ? applyMeganSettings(userId, today) : ensureMeganSettings(userId, today)),
  });
  if (result.aplicados.length > 0) revalidatePath("/", "layout");
  return Response.json(result);
}
