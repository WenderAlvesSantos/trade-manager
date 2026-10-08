"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { Button, Layout } from "antd";
import { logoutAction } from "@/actions/auth";
import { COLORS } from "@/lib/theme";
import { Brand } from "./brand";
import { NavMenu } from "./nav-menu";

function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <Button htmlType="submit" type="text" icon={<LogoutOutlined />} block={!compact} className="justify-start!">
        {!compact && "Sair"}
      </Button>
    </form>
  );
}

function DesktopSider({ userSlot }: { userSlot: React.ReactNode }) {
  return (
    <Layout.Sider
      width={240}
      className="max-md:hidden!"
      style={{ position: "sticky", top: 0, height: "100svh", borderRight: `1px solid ${COLORS.border}` }}
    >
      <div className="flex h-full flex-col p-4">
        <Brand />
        <p className="mt-8 mb-2 px-1 text-[11px] font-medium tracking-widest uppercase" style={{ color: COLORS.textMuted }}>
          Menu
        </p>
        <div className="flex-1">
          <NavMenu mode="inline" />
        </div>
        <div className="flex flex-col gap-2 pt-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {userSlot}
          <LogoutButton />
        </div>
      </div>
    </Layout.Sider>
  );
}

function MobileHeader() {
  return (
    <Layout.Header
      className="sticky top-0 z-40 flex items-center gap-2 px-4! md:hidden!"
      style={{ borderBottom: `1px solid ${COLORS.border}` }}
    >
      <Brand collapsed />
      <NavMenu mode="horizontal" />
      <LogoutButton compact />
    </Layout.Header>
  );
}

export function AppShell({ userSlot, children }: { userSlot: React.ReactNode; children: React.ReactNode }) {
  return (
    <Layout className="min-h-svh">
      <DesktopSider userSlot={userSlot} />
      <Layout>
        <MobileHeader />
        <Layout.Content>
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">{children}</div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
