"use client";

import { Card, Skeleton } from "antd";

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <Skeleton active title={{ width: 200 }} paragraph={{ rows: 1, width: 320 }} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index}>
            <Skeleton active title={false} paragraph={{ rows: 2 }} />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}
