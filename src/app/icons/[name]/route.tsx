import { PWA_ICON_SIZES, renderAppIcon } from "@/lib/pwa-icon";

// /icons/192, /icons/512 e /icons/maskable-512 (referenciados no manifest).
const ICONS: Record<string, () => Response> = {
  ...Object.fromEntries(PWA_ICON_SIZES.map((size) => [String(size), () => renderAppIcon(size)])),
  "maskable-512": () => renderAppIcon(512, { maskable: true }),
};

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const icon = ICONS[(await params).name];
  return icon ? icon() : new Response("Not found", { status: 404 });
}
