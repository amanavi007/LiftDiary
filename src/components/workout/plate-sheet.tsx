"use client";

import { PLATE_SIZES, barWeightFor, calcPlates, type Units } from "@/lib/workout-helpers";

// Standard gym plate colours, indexed like PLATE_SIZES.
const PALETTE = [
  "bg-red-600 text-white",
  "bg-blue-600 text-white",
  "bg-yellow-400 text-zinc-900",
  "bg-green-600 text-white",
  "bg-zinc-100 text-zinc-900",
  "bg-zinc-600 text-white",
];
const HEIGHTS = ["h-14", "h-12", "h-10", "h-7", "h-5", "h-3"];

function plateClass(plate: number, units: Units) {
  const i = Math.max(0, PLATE_SIZES[units].indexOf(plate));
  return { color: PALETTE[i], h: HEIGHTS[i] };
}

export function PlateSheet({
  weight,
  units,
  onChange,
}: {
  weight: number;
  units: Units;
  onChange: (weight: number) => void;
}) {
  const bar = barWeightFor(units);
  const plates = calcPlates(weight, units);
  const round = (n: number) => Math.round(n * 1000) / 1000;

  return (
    <div className="rounded-2xl border border-line bg-bg p-3">
      <div className="flex items-center justify-center overflow-x-auto py-3">
        <div className="h-5 w-2 shrink-0 rounded-l-sm bg-zinc-500" />
        <div className="h-2 w-4 shrink-0 bg-zinc-600" />
        {[...plates].reverse().map((p, i) => (
          <button
            key={`l${i}`}
            type="button"
            aria-label={`Remove ${p} ${units} from both sides`}
            onClick={() => onChange(Math.max(bar, round(weight - p * 2)))}
            className={`${plateClass(p, units).h} ${plateClass(p, units).color} mx-px w-3 shrink-0 rounded-sm`}
          />
        ))}
        <div className="h-1.5 w-6 shrink-0 bg-zinc-500/60" />
        {plates.map((p, i) => (
          <button
            key={`r${i}`}
            type="button"
            aria-label={`Remove ${p} ${units} from both sides`}
            onClick={() => onChange(Math.max(bar, round(weight - p * 2)))}
            className={`${plateClass(p, units).h} ${plateClass(p, units).color} mx-px w-3 shrink-0 rounded-sm`}
          />
        ))}
        <div className="h-2 w-4 shrink-0 bg-zinc-600" />
        <div className="h-5 w-2 shrink-0 rounded-r-sm bg-zinc-500" />
      </div>
      <p className="text-center text-xs text-muted-2">
        {plates.length === 0 ? `Bar only (${bar} ${units})` : `${bar} bar + ${plates.join(" + ")} per side = `}
        <span className="font-bold text-ink">
          {weight} {units}
        </span>
      </p>
      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {PLATE_SIZES[units].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(round(weight + p * 2))}
            className={`${plateClass(p, units).color} flex h-11 items-center justify-center rounded-xl text-[11px] font-bold active:scale-95`}
          >
            +{p}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onChange(bar)} className="mt-2 w-full text-center text-xs text-muted underline">
        Reset to bar ({bar} {units})
      </button>
    </div>
  );
}
