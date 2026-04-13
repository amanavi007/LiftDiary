"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsonFetch } from "@/lib/client";

type DayPlan = {
  id: string;
  label: string;
  exercises: Array<{
    name: string;
    targetSets: number;
    targetRepRangeLow: number;
    targetRepRangeHigh: number;
  }>;
};

export function HomeTodayPlanClient({
  dayPlans,
  defaultDayId,
}: {
  dayPlans: DayPlan[];
  defaultDayId: string;
}) {
  const router = useRouter();
  const [selectedDayId, setSelectedDayId] = useState(defaultDayId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDay = useMemo(
    () => dayPlans.find((day) => day.id === selectedDayId) ?? dayPlans[0],
    [dayPlans, selectedDayId],
  );

  const estimatedMinutes = useMemo(() => {
    if (!selectedDay) return 0;
    const exerciseCount = selectedDay.exercises.length;
    const setCount = selectedDay.exercises.reduce((sum, ex) => sum + ex.targetSets, 0);
    return Math.max(20, Math.round(exerciseCount * 4 + setCount * 2.2));
  }, [selectedDay]);

  async function startWorkout() {
    if (!selectedDay) return;
    setError(null);
    setLoading(true);
    try {
      const data = await jsonFetch<{ sessionId: string }>("/api/workouts/start", {
        method: "POST",
        body: JSON.stringify({ routineDayId: selectedDay.id }),
      });
      router.push(`/workout/session/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workout");
    } finally {
      setLoading(false);
    }
  }

  if (!selectedDay) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/4 p-5">
        <p className="text-sm text-zinc-200/80">No routine day found. Add a split in settings first.</p>
      </section>
    );
  }

  const preview = selectedDay.exercises.slice(0, 4);
  const overflow = selectedDay.exercises.length - preview.length;

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
      {/* Day selector strip */}
      {dayPlans.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-white/8 px-4 py-3 scrollbar-none">
          {dayPlans.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDayId(day.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                selectedDayId === day.id
                  ? "bg-orange-500 text-white"
                  : "bg-white/8 text-zinc-400 hover:bg-white/14 hover:text-zinc-200"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}

      {/* Hero content */}
      <div className="px-5 pb-5 pt-4">
        {/* Day name + meta */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-300/70">
            Today&apos;s Workout
          </p>
          <h2 className="mt-0.5 text-4xl font-black uppercase leading-none tracking-tight text-white">
            {selectedDay.label}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400">
            {selectedDay.exercises.length} exercise{selectedDay.exercises.length !== 1 ? "s" : ""}
            {" "}·{" "}
            ~{estimatedMinutes} min
          </p>
        </div>

        {/* Exercise list */}
        <div className="mb-5 space-y-0 divide-y divide-white/8 rounded-2xl border border-white/10 bg-black/20">
          {preview.map((exercise) => (
            <div
              key={exercise.name}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-sm font-medium text-zinc-100">{exercise.name}</span>
              <span className="shrink-0 text-xs text-zinc-500">
                {exercise.targetSets}×{exercise.targetRepRangeLow}–{exercise.targetRepRangeHigh}
              </span>
            </div>
          ))}
          {overflow > 0 && (
            <div className="px-4 py-2.5">
              <span className="text-xs text-zinc-500">+{overflow} more</span>
            </div>
          )}
        </div>

        {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}

        {/* Start button */}
        <button
          type="button"
          disabled={loading}
          onClick={startWorkout}
          className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 py-4 text-center text-base font-bold tracking-wide text-white shadow-lg shadow-orange-900/40 transition-opacity active:opacity-80 disabled:opacity-60"
        >
          {loading ? "Starting…" : `Start ${selectedDay.label}`}
        </button>
      </div>
    </section>
  );
}
