"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/ui/section-label";
import { SetRow } from "@/components/ui/set-row";
import { PlateSheet } from "@/components/workout/plate-sheet";
import { roundToUnit, type LoggedSet, type SetInput, type Units } from "@/lib/workout-helpers";

export function ActiveExercise({
  position,
  name,
  repLow,
  repHigh,
  targetSets,
  logged,
  coachWeight,
  coachReason,
  units,
  input,
  submitting,
  onInputChange,
  onLog,
  onOpenGuide,
}: {
  position: string;
  name: string;
  repLow: number;
  repHigh: number;
  targetSets: number;
  logged: LoggedSet[];
  coachWeight: number;
  coachReason: string;
  units: Units;
  input: SetInput;
  submitting: boolean;
  onInputChange: (next: SetInput) => void;
  onLog: () => void;
  onOpenGuide: () => void;
}) {
  const [showPlates, setShowPlates] = useState(false);
  const step = units === "KG" ? 2.5 : 5;
  const weightNow = input.weight === "" ? 0 : input.weight;
  const repsNow = input.reps === "" ? 0 : input.reps;
  const nextIndex = logged.length + 1;
  const complete = logged.length >= targetSets;
  const chip =
    "min-h-12 rounded-xl bg-surface text-sm font-bold text-ink transition active:scale-95 hover:bg-line";

  return (
    <section aria-label={name} className="space-y-4">
      <div>
        <SectionLabel>{position}</SectionLabel>
        <h2 className="mt-1 font-serif text-4xl leading-[0.95] lg:text-5xl">{name}</h2>
        <p className="mt-2 text-xs text-muted-2">
          Target {repLow}–{repHigh} reps
          {coachWeight > 0 ? (
            <>
              {" · Coach: "}
              <span className="font-bold text-accent">
                {coachWeight} {units.toLowerCase()}
              </span>
            </>
          ) : null}
        </p>
        {coachReason ? <p className="mt-0.5 text-xs text-muted">{coachReason}</p> : null}
      </div>

      <div className="space-y-2">
        {Array.from({ length: targetSets }, (_, i) => {
          const n = i + 1;
          const set = logged.find((s) => s.setIndex === n) ?? logged[i];
          if (set) {
            return (
              <div key={n}>
                <SetRow index={n} weight={set.weight} reps={set.reps} done active={false} units={units} />
                {set.isFailed ? <p className="ml-7 mt-1 text-[11px] font-bold text-warn">Marked failed</p> : null}
              </div>
            );
          }
          if (n === nextIndex && !complete) {
            return (
              <SetRow
                key={n}
                index={n}
                weight={input.weight}
                reps={input.reps}
                done={false}
                active
                units={units}
                disabled={submitting || input.weight === "" || input.reps === "" || Number(input.reps) < 1}
                onWeightChange={(weight) => onInputChange({ ...input, weight })}
                onRepsChange={(reps) => onInputChange({ ...input, reps })}
                onToggle={onLog}
              />
            );
          }
          return (
            <div key={n} className="opacity-40">
              <SetRow index={n} weight="" reps="" done={false} active={false} units={units} disabled />
            </div>
          );
        })}
      </div>

      {complete ? (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-bold text-accent">
          All sets logged for this exercise.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <button type="button" className={chip} onClick={() => onInputChange({ ...input, weight: Math.max(0, roundToUnit(weightNow - step, units)) })}>
              − {step}
            </button>
            <button type="button" className={chip} onClick={() => onInputChange({ ...input, weight: roundToUnit(weightNow + step, units) })}>
              + {step}
            </button>
            <button type="button" className={chip} onClick={() => onInputChange({ ...input, reps: Math.max(1, repsNow - 1) })}>
              − 1 rep
            </button>
            <button type="button" className={chip} onClick={() => onInputChange({ ...input, reps: repsNow + 1 })}>
              + 1 rep
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={input.isFailed}
              onClick={() => onInputChange({ ...input, isFailed: !input.isFailed })}
              className={`min-h-10 rounded-full px-4 text-xs font-bold transition ${
                input.isFailed ? "bg-warn/20 text-warn" : "bg-line text-muted-2"
              }`}
            >
              {input.isFailed ? "✓ Set failed" : "Mark set as failed"}
            </button>
            <button type="button" onClick={() => setShowPlates((v) => !v)} className="min-h-10 rounded-full bg-line px-4 text-xs font-bold text-muted-2">
              {showPlates ? "Hide plates" : "Load bar"}
            </button>
            <button type="button" onClick={onOpenGuide} className="min-h-10 rounded-full bg-line px-4 text-xs font-bold text-muted-2">
              ▶ Form guide
            </button>
          </div>

          {showPlates ? (
            <PlateSheet weight={weightNow} units={units} onChange={(weight) => onInputChange({ ...input, weight })} />
          ) : null}
        </>
      )}
    </section>
  );
}
