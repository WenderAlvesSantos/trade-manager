"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DashboardOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Menu } from "antd";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: <DashboardOutlined /> },
  { href: "/trades", label: "Trades", icon: <UnorderedListOutlined /> },
];

type Mode = "inline" | "horizontal";

function NavMenuView({ mode, query }: { mode: Mode; query: string }) {
  const pathname = usePathname();

  return (
    <Menu
      theme="dark"
      mode={mode}
      selectedKeys={[pathname]}
      style={{ borderInlineEnd: 0, borderBottom: 0, flex: mode === "horizontal" ? 1 : undefined }}
      items={NAV_ITEMS.map(({ href, label, icon }) => ({
        key: href,
        icon,
        label: <Link href={`${href}${query}`}>{label}</Link>,
      }))}
    />
  );
}

// Os filtros (conta/período) vivem na URL; repassá-los mantém o mesmo recorte ao trocar de tela.
function NavMenuWithFilters({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams().toString();
  return <NavMenuView mode={mode} query={searchParams ? `?${searchParams}` : ""} />;
}

export function NavMenu({ mode }: { mode: Mode }) {
  return (
    <Suspense fallback={<NavMenuView mode={mode} query="" />}>
      <NavMenuWithFilters mode={mode} />
    </Suspense>
  );
}
