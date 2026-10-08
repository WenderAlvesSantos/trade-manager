import { Suspense } from "react";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

async function UserEmail() {
  const session = await auth();
  return <p className="truncate px-1 text-xs text-white/45">{session?.user?.email}</p>;
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
      {children}
    </AppShell>
  );
}
