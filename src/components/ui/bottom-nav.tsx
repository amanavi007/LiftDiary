"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/dashboard", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <span className={`h-1 w-5 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
