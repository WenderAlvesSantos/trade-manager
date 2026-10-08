import { PageHeader } from "@/components/layout/page-header";
import { businessDaysOfMonth, todayInSaoPaulo } from "@/lib/b3-calendar";
import { requireUserId } from "@/lib/session";
import { loadSettingsPageData } from "@/lib/settings-page-data";
import { PushSettingsCard } from "./push-settings-card";
import { RiskSettingsTabs } from "./risk-settings-tabs";

export async function SettingsContent() {
  const userId = await requireUserId();
  const today = todayInSaoPaulo();
  const [year, month] = today.split("-").map(Number);
  const data = await loadSettingsPageData(userId, today);

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Gerenciamento de risco por conta e ativo: robô, projeção do mês e gestão de banca."
      />
      <RiskSettingsTabs data={data} businessDays={businessDaysOfMonth(year, month).length} />
      <PushSettingsCard />
    </>
  );
}
