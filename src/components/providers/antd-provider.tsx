"use client";

import { App, ConfigProvider, theme } from "antd";
import ptBR from "antd/locale/pt_BR";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { COLORS } from "@/lib/theme";

dayjs.locale("pt-br");

const themeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: COLORS.primary,
    colorSuccess: COLORS.profit,
    colorError: COLORS.loss,
    colorBgLayout: COLORS.bgLayout,
    colorBgContainer: COLORS.bgContainer,
    colorBgElevated: COLORS.bgElevated,
    colorBorderSecondary: COLORS.border,
    borderRadius: 8,
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  components: {
    Layout: { siderBg: COLORS.bgSider, bodyBg: COLORS.bgLayout, headerBg: COLORS.bgSider },
    Menu: { darkItemBg: COLORS.bgSider, darkItemSelectedBg: "rgba(59, 130, 246, 0.16)", darkItemSelectedColor: COLORS.primary },
    Card: { colorBorderSecondary: COLORS.border },
    Table: { headerBg: COLORS.bgElevated, rowExpandedBg: COLORS.bgLayout },
  },
};

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={ptBR} theme={themeConfig}>
      <App className="flex min-h-svh flex-col">{children}</App>
    </ConfigProvider>
  );
}
