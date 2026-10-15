import { Alert } from "antd";
import type { AccountType } from "@/generated/prisma/enums";
import { loadRiskDashboard } from "@/lib/risk-dashboard-data";
import { activeConfigs, getAccountRiskConfigs } from "@/lib/risk-settings";
import { sizingUnit } from "@/lib/sizing-unit";
import { BankrollCard } from "./bankroll-card";
import { BankrollEvolutionCard } from "./bankroll-evolution-card";
import { ContractPlanCard } from "./contract-plan-card";
import { DeviationAlert } from "./deviation-alert";
import { FutureMonthsCard } from "./future-months-card";
import { MonthLadderCard } from "./month-ladder-card";
import { MonthProjectionCard } from "./month-projection-card";

type RiskManagementSectionProps = { userId: string; account?: AccountType; today: string };

// Projeção do mês e gestão da banca da conta: os ativos operados dividem uma banca e a mesma quantidade de
// contratos, então a seção ignora o filtro de ativo (ele vale só para as estatísticas do período).
export async function RiskManagementSection({ userId, account, today }: RiskManagementSectionProps) {
  if (!account) {
    return (
      <Alert
        type="info"
        showIcon
        title="Selecione Simulador ou Real no filtro para ver a projeção do mês e a gestão de banca."
      />
    );
  }

  const configs = activeConfigs(await getAccountRiskConfigs(userId, account, today));
  if (configs.length === 0) {
    return <Alert type="info" showIcon title="Nenhum ativo marcado como operado nesta conta. Ative WIN ou WDO em Configurações." />;
  }

  const data = await loadRiskDashboard(userId, account, sizingUnit(configs), today);
  return (
    <div className="flex flex-col gap-4">
      <DeviationAlert data={data} />
      <section className="grid gap-4 lg:grid-cols-2">
        <MonthProjectionCard data={data} />
        <BankrollCard data={data} />
      </section>
      <MonthLadderCard data={data} />
      <BankrollEvolutionCard data={data} />
      <FutureMonthsCard data={data} />
      <ContractPlanCard data={data} />
    </div>
  );
}
