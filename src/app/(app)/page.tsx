import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
