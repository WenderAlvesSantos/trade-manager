import type { MetadataRoute } from "next";
import { COLORS } from "@/lib/theme";

// Torna o app instalável (Android/desktop e "Adicionar à Tela de Início" no iPhone, requisito do Web Push no iOS).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Megan - Trade Manager",
    short_name: "Megan",
    description: "Diário de trades para Day Trade de WIN e WDO na B3.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: COLORS.bgLayout,
    theme_color: COLORS.bgLayout,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
