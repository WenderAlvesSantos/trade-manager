import { CandlestickChart } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <CandlestickChart className="size-6 text-primary" />
        Megan ASG - Trade Manager
      </div>
      {children}
    </main>
  );
}
