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
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur lg:hidden">
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

export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-bg px-4 py-8 lg:flex">
      <Link href="/home" className="mb-8 px-3 font-serif text-3xl leading-none text-ink">
        Lift<i className="text-accent">Diary</i>
      </Link>
      <ul className="space-y-1">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-bold transition hover:bg-surface ${
                  active ? "bg-surface text-accent" : "text-muted-2"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
