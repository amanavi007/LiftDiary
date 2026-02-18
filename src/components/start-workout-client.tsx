"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { jsonFetch } from "@/lib/client";

type DayItem = {
  id: string;
  dayIndex: number;
  label: string;
};

export function StartWorkoutClient({ days }: { days: DayItem[] }) {
  const router = useRouter();
  const [selectedDayId, setSelectedDayId] = useState(days[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDay = useMemo(() => days.find((day) => day.id === selectedDayId), [days, selectedDayId]);

  async function startWorkout() {
    setError(null);
    setLoading(true);
    try {
      const data = await jsonFetch<{ sessionId: string }>("/api/workouts/start", {
        method: "POST",
        body: JSON.stringify({ routineDayId: selectedDayId }),
      });
      router.push(`/workout/session/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start workout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-card-strong space-y-3 rounded-2xl p-5">
      <h1 className="text-2xl font-bold text-white">Start Workout</h1>
      <p className="text-sm text-zinc-200/80">Choose a day and launch your session.</p>

      <div className="space-y-2">
        {days.map((day) => (
          <button
            key={day.id}
            type="button"
            onClick={() => setSelectedDayId(day.id)}
            className={`w-full rounded-lg border px-3 py-3 text-left ${
              selectedDayId === day.id
                ? "border-white/50 bg-white/20 text-white"
                : "border-white/20 bg-white/8 text-zinc-100"
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        disabled={!selectedDay || loading}
        onClick={startWorkout}
        className="glass-button"
      >
        {loading ? "Starting..." : `Begin ${selectedDay?.label ?? "Workout"}`}
      </button>
    </section>
  );
}
