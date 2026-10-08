export const COLORS = {
  primary: "#3b82f6",
  profit: "#22c55e",
  loss: "#ef4444",
  warning: "#f59e0b",
  bgLayout: "#0a0d12",
  bgContainer: "#11161d",
  bgElevated: "#161c25",
  bgSider: "#0d1117",
  border: "#1f2733",
  textMuted: "rgba(255, 255, 255, 0.45)",
} as const;

export const resultHex = (value: number) =>
  value > 0 ? COLORS.profit : value < 0 ? COLORS.loss : undefined;
