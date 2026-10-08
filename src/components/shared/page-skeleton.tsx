const Block = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-muted ${className}`} />
);

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Block key={index} className="h-28" />
        ))}
      </div>
      <Block className="h-40" />
      <Block className="h-64" />
    </div>
  );
}
