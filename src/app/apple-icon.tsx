import { renderAppIcon } from "@/lib/pwa-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// O iOS aplica os cantos arredondados sozinho; o ícone vai quadrado.
export default function AppleIcon() {
  return renderAppIcon(size.width);
}
