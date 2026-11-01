import { revalidatePath } from "next/cache";
import { todayInSaoPaulo } from "@/lib/b3-calendar";
import { integrationAuthError } from "@/lib/integration-users";
import { bankrollSyncSchema } from "@/lib/megan-risk";
import { applyMeganChanges, meganBankroll } from "@/lib/megan-sync";
import { prisma } from "@/lib/prisma";
import { firstIssueMessage } from "@/lib/validations";

// POST /api/integracao/gerenciamento — chamado pelo site da Megan.
// Com `initialBankroll`, grava a banca inicial do WIN na conta (Real/Simulador) a partir de hoje;
// com `confirmBankroll`, confirma a banca padrão (R$ 1.000) no primeiro uso;
// com `contracts`, registra os contratos com que a Megan iniciou como o nível atual.
// Sempre devolve a banca atual e os contratos sugeridos pelo gerenciamento de banca.
export async function POST(request: Request) {
  const negado = integrationAuthError(request);
  if (negado) return negado;

  const body = await request.json().catch(() => null);
  const parsed = bankrollSyncSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });

  const { email, accountType, ...changes } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return Response.json({ status: "sem_usuario" }, { status: 404 });

  const today = todayInSaoPaulo();
  if (await applyMeganChanges(user.id, accountType, changes, today)) {
    revalidatePath("/", "layout");
  }
  const reply = await meganBankroll(user.id, accountType, today);
  if (!reply) return Response.json({ status: "sem_ativo" }, { status: 409 });
  return Response.json(reply);
}
