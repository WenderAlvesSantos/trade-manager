import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsContent } from "@/components/settings/settings-content";
import { PageSkeleton } from "@/components/shared/page-skeleton";

export const metadata: Metadata = { title: "Configurações | Megan ASG" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}
