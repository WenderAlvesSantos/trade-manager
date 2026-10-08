import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { TradesContent } from "@/components/trades/trades-content";

export const metadata: Metadata = { title: "Trades | Megan ASG" };

export default function TradesPage({ searchParams }: PageProps<"/trades">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TradesContent searchParams={searchParams} />
    </Suspense>
  );
}
