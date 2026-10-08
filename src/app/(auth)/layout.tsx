import { Brand } from "@/components/layout/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center gap-8 p-6"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15), transparent 60%), #0a0d12",
      }}
    >
      <Brand />
      {children}
    </main>
  );
}
