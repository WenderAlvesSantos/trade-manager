import { Suspense } from "react";
import { auth } from "@/auth";
import { AlertNotifier } from "@/components/layout/alert-notifier";
import { AppShell } from "@/components/layout/app-shell";
import { loadAppAlerts } from "@/lib/app-alerts";
import { todayInSaoPaulo } from "@/lib/b3-calendar";

async function UserEmail() {
  const session = await auth();
  return <p className="truncate px-1 text-xs text-white/45">{session?.user?.email}</p>;
}

// O layout é revalidado ao salvar trades/configurações, então os avisos aparecem logo após a mudança.
async function Alerts() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return <AlertNotifier alerts={await loadAppAlerts(userId, todayInSaoPaulo())} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      userSlot={
        <Suspense fallback={<div className="h-4" />}>
          <UserEmail />
        </Suspense>
      }
    >
      <Suspense fallback={null}>
        <Alerts />
      </Suspense>
      {children}
    </AppShell>
  );
}
