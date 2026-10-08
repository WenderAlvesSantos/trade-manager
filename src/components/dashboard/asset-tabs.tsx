"use client";

import { Tabs } from "antd";

export type AssetTabItem = { key: string; label: string; content: React.ReactNode };

// Um ativo: conteúdo direto. Vários (WIN e WDO na mesma conta): uma aba por ativo.
export function AssetTabs({ items }: { items: AssetTabItem[] }) {
  if (items.length === 1) return <div className="flex flex-col gap-4">{items[0].content}</div>;
  return (
    <Tabs
      type="card"
      items={items.map(({ key, label, content }) => ({
        key,
        label,
        children: <div className="flex flex-col gap-4">{content}</div>,
      }))}
    />
  );
}
