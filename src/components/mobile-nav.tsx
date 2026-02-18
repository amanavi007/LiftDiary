"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/home", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/dashboard", label: "PRs" },
  { href: "/settings", label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe pt-2">
      <ul className="glass-card mx-auto grid max-w-md grid-cols-4 gap-2 rounded-2xl p-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${
                  active ? "bg-white/20 text-white" : "text-zinc-300/90 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
