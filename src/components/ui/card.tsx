import { ReactNode } from "react";

export function Card({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: "default" | "accent";
  className?: string;
}) {
  const toneClass =
    tone === "accent" ? "border border-accent/25 bg-accent/10" : "border border-line bg-surface";
  return <div className={`rounded-2xl p-4 ${toneClass} ${className}`}>{children}</div>;
}
