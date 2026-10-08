"use client";

import { Badge, Tabs } from "antd";
import type { AccountType } from "@/generated/prisma/enums";
import { ASSETS } from "@/lib/risk-projection";
import type { SettingsPageData } from "@/lib/settings-page-data";
import { ACCOUNT_OPTIONS } from "@/lib/trade-filters";
import { LevelHistoryTable } from "./level-history-table";
import { RiskSettingsForm } from "./risk-settings-form";
import { RuleHistoryTable } from "./rule-history-table";

type RiskSettingsTabsProps = { data: SettingsPageData; businessDays: number };

function AssetTabs({ account, data, businessDays }: { account: AccountType } & RiskSettingsTabsProps) {
  // Mesma regra de activeConfigs: sem nada salvo na conta, WIN é o ativo padrão.
  const anySaved = ASSETS.some((asset) => data[account][asset].config.saved);
  return (
    <Tabs
      type="card"
      items={ASSETS.map((asset) => {
        const { config, levelHistory, ruleHistory, bankrollCurve } = data[account][asset];
        const operated = config.saved ? config.active : !anySaved && asset === "WIN";
        return {
          key: asset,
          label: <Badge status={operated ? "success" : "default"} text={asset} />,
          children: (
            <div className="flex flex-col gap-4">
              <RiskSettingsForm
                account={account}
                config={config}
                bankrollCurve={bankrollCurve}
                businessDays={businessDays}
              />
              <LevelHistoryTable history={levelHistory} />
              <RuleHistoryTable history={ruleHistory} />
            </div>
          ),
        };
      })}
    />
  );
}

// Conta (Simulador/Real) → ativo (WIN/WDO): cada combinação tem configuração, banca e históricos próprios.
export function RiskSettingsTabs({ data, businessDays }: RiskSettingsTabsProps) {
  return (
    <Tabs
      items={ACCOUNT_OPTIONS.map(({ value, label }) => ({
        key: value,
        label,
        children: <AssetTabs account={value} data={data} businessDays={businessDays} />,
      }))}
    />
  );
}
