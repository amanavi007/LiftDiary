import { ReactNode } from "react";

export function SectionLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] text-muted ${className}`}>{children}</p>
  );
}
