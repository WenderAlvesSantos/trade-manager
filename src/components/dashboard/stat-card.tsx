"use client";

import { Card, Statistic } from "antd";
import { COLORS } from "@/lib/theme";

export type StatItem = {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color?: string;
  hint?: string;
};

export function StatCard({ title, value, icon, color, hint }: StatItem) {
  return (
    <Card variant="borderless" className="h-full">
      <div className="flex items-start justify-between">
        <Statistic
          title={title}
          valueRender={() => <span style={{ color }}>{value}</span>}
          styles={{ content: { fontWeight: 600 } }}
        />
        <span
          className="flex size-9 items-center justify-center rounded-lg text-base"
          style={{ background: "rgba(59, 130, 246, 0.12)", color: COLORS.primary }}
        >
          {icon}
        </span>
      </div>
      {hint && <p className="mt-2 text-xs text-white/45">{hint}</p>}
    </Card>
  );
}
