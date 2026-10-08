import { CandlestickChart, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <CandlestickChart className="size-5 text-primary" />
          Megan - Trade Manager
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut />
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
