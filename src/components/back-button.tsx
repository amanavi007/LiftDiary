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
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-xs font-bold text-muted-2"
      aria-label="Go back"
    >
      <span aria-hidden>←</span>
      Back
    </button>
  );
}
