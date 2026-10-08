import { ImageResponse } from "next/og";
import { COLORS } from "@/lib/theme";

export const PWA_ICON_SIZES = [192, 512] as const;

// Ícone da marca (gráfico em alta sobre o gradiente do Brand). `maskable` deixa margem para recortes do Android.
export function renderAppIcon(size: number, { maskable = false, rounded = false } = {}) {
  const glyph = Math.round(size * (maskable ? 0.5 : 0.62));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${COLORS.primary}, #6366f1)`,
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="15 7 21 7 21 13" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
