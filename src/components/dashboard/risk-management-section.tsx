import { Alert } from "antd";
import type { AccountType, Asset } from "@/generated/prisma/enums";
import { loadRiskDashboard } from "@/lib/risk-dashboard-data";
import { activeConfigs, getAccountRiskConfigs } from "@/lib/risk-settings";
import { AssetTabs } from "./asset-tabs";
import { BankrollCard } from "./bankroll-card";
import { BankrollEvolutionCard } from "./bankroll-evolution-card";
import { ContractPlanCard } from "./contract-plan-card";
import { DeviationAlert } from "./deviation-alert";
import { FutureMonthsCard } from "./future-months-card";
import { MonthProjectionCard } from "./month-projection-card";

type RiskManagementSectionProps = { userId: string; account?: AccountType; asset?: Asset; today: string };

// Projeção do mês e gestão de banca dependem da configuração, que é por conta + ativo.
export async function RiskManagementSection({ userId, account, asset, today }: RiskManagementSectionProps) {
  if (!account) {
    return (
      <Alert
        type="info"
        showIcon
        title="Selecione Simulador ou Real no filtro para ver a projeção do mês e a gestão de banca."
      />
    );
  }

  const configs = activeConfigs(await getAccountRiskConfigs(userId, account, today), asset);
  if (configs.length === 0) {
    const title = asset
      ? `${asset} não está marcado como operado nesta conta. Ative-o em Configurações.`
      : "Nenhum ativo marcado como operado nesta conta. Ative WIN ou WDO em Configurações.";
    return <Alert type="info" showIcon title={title} />;
  }

  const dashboards = await Promise.all(configs.map((config) => loadRiskDashboard(userId, account, config, today)));
  return (
    <AssetTabs
      items={dashboards.map((data) => ({
        key: data.config.asset,
        label: data.config.asset,
        content: (
          <>
            <DeviationAlert data={data} />
            <section className="grid gap-4 lg:grid-cols-2">
              <MonthProjectionCard data={data} />
              <BankrollCard data={data} />
            </section>
            <BankrollEvolutionCard data={data} />
            <FutureMonthsCard data={data} />
            <ContractPlanCard data={data} />
          </>
        ),
      }))}
    />
  );
}
