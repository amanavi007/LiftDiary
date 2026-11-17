import { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { BottomNav, SideNav } from "@/components/ui/bottom-nav";

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
      {showNav ? <SideNav /> : null}
      <div className={showNav ? "lg:pl-60" : ""}>
        <main className="pt-safe relative mx-auto w-full max-w-md px-4 pb-4 pt-3 text-ink md:max-w-2xl lg:max-w-5xl lg:px-10 lg:pt-10">
          <div className="space-y-3 pb-24 lg:space-y-5 lg:pb-12">
            {showBack ? <BackButton /> : null}
            {children}
          </div>
        </main>
      </div>
      {showNav ? <BottomNav /> : null}
    </>
  );
}
