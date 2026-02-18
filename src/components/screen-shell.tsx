import { ReactNode } from "react";
import { MobileNav } from "@/components/mobile-nav";

export function ScreenShell({ children, showNav = true }: { children: ReactNode; showNav?: boolean }) {
  return (
    <main className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden px-4 pb-24 pt-4 text-zinc-50">
      <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-red-700/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-28 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="relative z-10">{children}</div>
      {showNav ? <MobileNav /> : null}
    </main>
  );
}
