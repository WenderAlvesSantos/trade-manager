import { z } from "zod";
import { auth } from "@/auth";
import { userLicense } from "@/lib/license-guard";
import { parseTradeFilters } from "@/lib/trade-filters";
import { getDayTrades } from "@/lib/trades";

const daySchema = z.iso.date();

// GET /api/trades?dia=2026-10-08&conta=REAL — trades de um dia, carregados quando a linha é expandida.
// O proxy não cobre /api, então a sessão é verificada aqui.
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Não autenticado." }, { status: 401 });
  if (!(await userLicense(userId))?.licenseOk) {
    return Response.json({ error: "Licença da Megan inválida ou vencida." }, { status: 403 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const day = daySchema.safeParse(params.dia);
  if (!day.success) return Response.json({ error: "Parâmetro 'dia' inválido." }, { status: 400 });

  return Response.json(await getDayTrades(userId, day.data, parseTradeFilters(params)));
}
