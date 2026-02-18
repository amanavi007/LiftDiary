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
      <section className="glass-card-strong rounded-2xl p-4">
        <p className="text-sm text-zinc-200/80">No routine day found. Add a split in settings first.</p>
      </section>
    );
  }

  return (
    <section className="glass-card-strong mb-4 rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-zinc-300/70">Today Plan</p>
      <p className="mt-1 text-2xl font-bold text-white">{selectedDay.label}</p>
      <p className="text-sm text-zinc-200/80">{selectedDay.exercises.length} exercises • ~{estimatedMinutes} min</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {dayPlans.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => setSelectedDayId(day.id)}
            className={`glass-pill px-3 py-1 text-xs ${selectedDayId === day.id ? "bg-white/20 text-white" : "text-zinc-200/85"}`}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-white/12 bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-200/70">Exercise Plan</p>
        {selectedDay.exercises.slice(0, 5).map((exercise) => (
          <div key={exercise.name} className="flex items-center justify-between text-xs text-zinc-200/85">
            <span>{exercise.name}</span>
            <span>{exercise.targetSets} sets • {exercise.targetRepRangeLow}-{exercise.targetRepRangeHigh}</span>
          </div>
        ))}
        {selectedDay.exercises.length > 5 ? (
          <p className="text-xs text-zinc-300/70">+{selectedDay.exercises.length - 5} more exercises</p>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

      <button
        type="button"
        disabled={loading}
        onClick={startWorkout}
        className="glass-button mt-4 block py-4 text-center text-lg"
      >
        {loading ? "Starting..." : `START ${selectedDay.label.toUpperCase()}`}
      </button>
    </section>
  );
}
