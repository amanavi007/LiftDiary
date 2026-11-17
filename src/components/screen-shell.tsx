import { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { BottomNav } from "@/components/ui/bottom-nav";

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
      <main className="pt-safe relative mx-auto w-full max-w-md px-4 pb-4 pt-3 text-ink">
        <div className="space-y-3 pb-24">
          {showBack ? <BackButton /> : null}
          {children}
        </div>
      </main>
      {showNav ? <BottomNav /> : null}
    </>
  );
}
