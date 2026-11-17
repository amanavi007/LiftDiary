"use client";

export type SetRowProps = {
  index: number;
  weight: number | "";
  reps: number | "";
  done: boolean;
  active: boolean;
  units: "LB" | "KG";
  disabled?: boolean;
  onWeightChange?: (value: number | "") => void;
  onRepsChange?: (value: number | "") => void;
  onToggle?: () => void;
};

function parse(value: string): number | "" {
  if (value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function Box({
  value,
  caption,
  active,
  readOnly,
  step,
  onChange,
}: {
  value: number | "";
  caption: string;
  active: boolean;
  readOnly: boolean;
  step: string;
  onChange?: (v: number | "") => void;
}) {
  return (
    <label
      className={`flex flex-col items-center rounded-xl bg-surface py-2 ${active ? "outline outline-2 outline-accent" : ""}`}
    >
      <input
        inputMode="decimal"
        type="number"
        step={step}
        min={0}
        value={value}
        readOnly={readOnly}
        aria-label={caption}
        onChange={(e) => onChange?.(parse(e.target.value))}
        className="tabular w-full bg-transparent text-center font-serif text-4xl leading-none text-ink outline-none"
      />
      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">{caption}</span>
    </label>
  );
}

export function SetRow({
  index,
  weight,
  reps,
  done,
  active,
  units,
  disabled,
  onWeightChange,
  onRepsChange,
  onToggle,
}: SetRowProps) {
  return (
    <div className={`grid grid-cols-[1.25rem_1fr_1fr_3.5rem] items-center gap-2 ${done ? "opacity-55" : ""}`}>
      <span className={`text-[11px] font-bold ${active ? "text-accent" : "text-muted"}`}>{index}</span>
      <Box value={weight} caption={units} active={active} readOnly={done} step="0.5" onChange={onWeightChange} />
      <Box value={reps} caption="Reps" active={active} readOnly={done} step="1" onChange={onRepsChange} />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || done}
        aria-label={done ? `Set ${index} logged` : `Log set ${index}`}
        className={`flex h-14 items-center justify-center rounded-xl text-xl font-black transition active:scale-95 ${
          done || active ? "bg-accent text-bg" : "bg-line text-muted"
        } disabled:active:scale-100`}
      >
        ✓
      </button>
    </div>
  );
}
