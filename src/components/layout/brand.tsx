"use client";

import { StockOutlined } from "@ant-design/icons";
import { COLORS } from "@/lib/theme";

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg text-white"
        style={{ background: `linear-gradient(135deg, ${COLORS.primary}, #6366f1)` }}
      >
        <StockOutlined />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Megan</p>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
            Trade Manager
          </p>
        </div>
      )}
    </div>
  );
}
