import { ReactNode } from "react";

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warn";
}) {
  const tones = {
    default: "bg-line text-muted-2",
    accent: "bg-accent/15 text-accent",
    warn: "bg-warn/15 text-warn",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  );
}
