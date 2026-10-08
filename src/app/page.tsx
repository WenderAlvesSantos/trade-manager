import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Navbar } from "@/components/dashboard/navbar";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-muted/40">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
