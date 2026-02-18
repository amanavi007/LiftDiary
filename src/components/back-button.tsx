"use client";

import { usePathname, useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/home" }: { fallbackHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/home" || pathname === "/") {
    return null;
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="glass-pill inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-100/90"
      aria-label="Go back"
    >
      <span aria-hidden>←</span>
      Back
    </button>
  );
}
