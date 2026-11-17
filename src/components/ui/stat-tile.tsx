export function StatTile({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: "default" | "accent";
}) {
  return (
    <div className="flex-1 rounded-2xl border border-line bg-surface px-3 py-3 text-center">
      <div className={`tabular font-serif text-3xl leading-none ${tone === "accent" ? "text-accent" : "text-ink"}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</div>
    </div>
  );
}
