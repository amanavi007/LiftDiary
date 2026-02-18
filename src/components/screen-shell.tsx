import { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { MobileNav } from "@/components/mobile-nav";

export function ScreenShell({
  children,
  showNav = true,
  showBack = true,
}: {
  children: ReactNode;
  showNav?: boolean;
  showBack?: boolean;
}) {
  return (
    <>
      <main className="relative mx-auto w-full max-w-md px-4 pb-4 pt-2 text-zinc-50">
        <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-red-700/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-28 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative z-10 space-y-3">
          {showBack ? <BackButton /> : null}
          {children}
        </div>
      </main>
      {showNav ? <MobileNav /> : null}
    </>
  );
}
