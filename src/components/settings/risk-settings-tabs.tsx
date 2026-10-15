"use client";

import { Badge, Tabs } from "antd";
import type { AccountType, Asset } from "@/generated/prisma/enums";
import { ASSETS } from "@/lib/risk-projection";
import type { AccountSettingsData, SettingsPageData } from "@/lib/settings-page-data";
import { ACCOUNT_OPTIONS } from "@/lib/trade-filters";
import { LevelHistoryTable } from "./level-history-table";
import { RiskSettingsForm } from "./risk-settings-form";
import { RuleHistoryTable } from "./rule-history-table";

type RiskSettingsTabsProps = { data: SettingsPageData; businessDays: number };

// Mesma regra de activeConfigs: sem nada salvo na conta, WIN é o ativo padrão.
function operatedAssets(account: AccountSettingsData): Asset[] {
  const anySaved = ASSETS.some((asset) => account.assets[asset].config.saved);
  return ASSETS.filter((asset) => {
    const { config } = account.assets[asset];
    return config.saved ? config.active : !anySaved && asset === "WIN";
  });
}

type AssetTabsProps = { account: AccountType; data: AccountSettingsData; businessDays: number };

function AssetTabs({ account, data, businessDays }: AssetTabsProps) {
  const operated = operatedAssets(data);
  return (
    <Tabs
      type="card"
      items={ASSETS.map((asset) => {
        const { config, levelHistory, ruleHistory, bankrollCurve } = data.assets[asset];
        const others = operated.filter((other) => other !== asset).map((other) => data.assets[other].config);
        return {
          key: asset,
          label: <Badge status={operated.includes(asset) ? "success" : "default"} text={asset} />,
          children: (
            <div className="flex flex-col gap-4">
              <RiskSettingsForm
                account={account}
                config={config}
                bankrollCurve={bankrollCurve}
                otherAssets={others}
                combinedCurve={data.combinedCurve}
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

// Conta (Simulador/Real) → ativo (WIN/WDO): cada combinação tem configuração e históricos próprios;
// os ativos operados dividem a banca da conta.
export function RiskSettingsTabs({ data, businessDays }: RiskSettingsTabsProps) {
  return (
    <Tabs
      items={ACCOUNT_OPTIONS.map(({ value, label }) => ({
        key: value,
        label,
        children: <AssetTabs account={value} data={data[value]} businessDays={businessDays} />,
      }))}
    />
  );
}
