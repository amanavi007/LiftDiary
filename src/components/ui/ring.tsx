export function Ring({
  value,
  label,
  size = 84,
}: {
  value: number | null;
  label: string;
  size?: number;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  const inner = size - 18;
  return (
    <div
      role="img"
      aria-label={value === null ? `${label}: no score yet` : `${label}: ${pct} out of 100`}
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--color-accent) 0 ${pct}%, var(--color-line) ${pct}% 100%)`,
      }}
    >
      <div
        className="flex flex-col items-center justify-center rounded-full bg-surface"
        style={{ width: inner, height: inner }}
      >
        <span className="tabular font-serif text-[1.65rem] leading-none text-ink">
          {value === null ? "—" : pct}
        </span>
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
      </div>
    </div>
  );
}
