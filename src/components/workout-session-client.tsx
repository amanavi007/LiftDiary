"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/client";

type SessionExercise = {
  exercise: {
    id: string;
    name: string;
    defaultRestSec: number;
  };
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  recommendation: {
    recommendedWeight: number;
    recommendedRepLow: number;
    recommendedRepHigh: number;
    confidenceScore: number;
    modelVersion: string;
    reasonText: string;
  };
  loggedSets: {
    setIndex: number;
    weight: number;
    reps: number;
    isFailed: boolean;
  }[];
};

type SessionPayload = {
  session: {
    id: string;
    routineDay: { label: string };
    exercises: SessionExercise[];
    units: "LB" | "KG";
  };
};

export function WorkoutSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload["session"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRestExercise, setActiveRestExercise] = useState<string | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [submittingSetFor, setSubmittingSetFor] = useState<string | null>(null);

  const [setInputs, setSetInputs] = useState<
    Record<
      string,
      {
        weight: number;
        reps: number;
        isFailed: boolean;
      }
    >
  >({});

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      setError(null);
      try {
        const data = await jsonFetch<SessionPayload>(`/api/sessions/${sessionId}`);
        setSession(data.session);

        const initialInputs: Record<string, { weight: number; reps: number; isFailed: boolean }> = {};
        for (const exercise of data.session.exercises) {
          const lastLogged = exercise.loggedSets.at(-1);
          initialInputs[exercise.exercise.id] = {
            weight:
              lastLogged?.weight ||
              exercise.recommendation.recommendedWeight ||
              0,
            reps:
              lastLogged?.reps ||
              exercise.recommendation.recommendedRepHigh ||
              exercise.targetRepRangeHigh,
            isFailed: false,
          };
        }
        setSetInputs(initialInputs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load session");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (!activeRestExercise || restSecondsLeft <= 0) return;
    const id = setInterval(() => {
      setRestSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [activeRestExercise, restSecondsLeft]);

  const totalVolume = useMemo(() => {
    if (!session) return 0;
    return session.exercises
      .flatMap((exercise) => exercise.loggedSets)
      .reduce((sum, set) => sum + set.weight * set.reps, 0);
  }, [session]);

  async function refreshSession() {
    const data = await jsonFetch<SessionPayload>(`/api/sessions/${sessionId}`);
    setSession(data.session);
  }

  async function logSet(exerciseId: string) {
    if (!session) return;
    const exercise = session.exercises.find((item) => item.exercise.id === exerciseId);
    const values = setInputs[exerciseId];
    if (!exercise || !values) return;

    const nextSetIndex = exercise.loggedSets.length + 1;

    setSubmittingSetFor(exerciseId);
    try {
      await jsonFetch(`/api/sessions/${sessionId}/sets`, {
        method: "POST",
        body: JSON.stringify({
          exerciseId,
          setIndex: nextSetIndex,
          weight: values.weight,
          reps: values.reps,
          isFailed: values.isFailed,
        }),
      });

      await refreshSession();
      setActiveRestExercise(exerciseId);
      setRestSecondsLeft(exercise.exercise.defaultRestSec || 90);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log set");
    } finally {
      setSubmittingSetFor(null);
    }
  }

  async function finishWorkout() {
    await jsonFetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify({ endedAt: new Date().toISOString() }),
    });
    router.push(`/workout/summary/${sessionId}`);
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading session...</p>;
  }

  if (error || !session) {
    return <p className="text-sm text-red-400">{error ?? "No session"}</p>;
  }

  return (
    <div className="space-y-3 pb-10">
      <header className="glass-card-strong rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">{session.routineDay.label}</p>
        <h1 className="text-2xl font-bold text-white">Workout In Progress</h1>
        <p className="text-sm text-zinc-200/80">Volume: {totalVolume.toFixed(0)} {session.units}</p>
      </header>

      {session.exercises.map((item) => {
        const input = setInputs[item.exercise.id] ?? { weight: 0, reps: item.targetRepRangeHigh, isFailed: false };
        const isResting = activeRestExercise === item.exercise.id && restSecondsLeft > 0;

        return (
          <section key={item.exercise.id} className="glass-card rounded-2xl p-4">
            <h2 className="text-lg font-semibold">{item.exercise.name}</h2>
            <p className="text-xs text-zinc-200/80">
              Rec: {item.recommendation.recommendedWeight || "—"} {session.units} • {item.recommendation.recommendedRepLow}-{item.recommendation.recommendedRepHigh} reps
            </p>
            <p className="mb-3 text-xs text-zinc-200/60">{item.recommendation.reasonText}</p>

            <div className="mb-2 grid grid-cols-3 gap-2 text-sm">
              <label>
                Weight
                <input
                  type="number"
                  value={input.weight}
                  onChange={(e) =>
                    setSetInputs((prev) => ({
                      ...prev,
                      [item.exercise.id]: {
                        ...input,
                        weight: Number(e.target.value),
                      },
                    }))
                  }
                  className="glass-input mt-1 px-2 py-1"
                />
              </label>
              <label>
                Reps
                <input
                  type="number"
                  value={input.reps}
                  onChange={(e) =>
                    setSetInputs((prev) => ({
                      ...prev,
                      [item.exercise.id]: {
                        ...input,
                        reps: Number(e.target.value),
                      },
                    }))
                  }
                  className="glass-input mt-1 px-2 py-1"
                />
              </label>
              <label className="flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={input.isFailed}
                  onChange={(e) =>
                    setSetInputs((prev) => ({
                      ...prev,
                      [item.exercise.id]: {
                        ...input,
                        isFailed: e.target.checked,
                      },
                    }))
                  }
                />
                <span className="text-xs">Mark Failed</span>
              </label>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => logSet(item.exercise.id)}
                disabled={submittingSetFor === item.exercise.id}
                className="rounded-xl bg-gradient-to-r from-red-700 to-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submittingSetFor === item.exercise.id ? "Logging..." : "Log Set"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveRestExercise(item.exercise.id);
                  setRestSecondsLeft(item.exercise.defaultRestSec || 90);
                }}
                className="rounded-xl border border-white/30 bg-white/8 px-3 py-2 text-sm"
              >
                Start Rest
              </button>
            </div>

            {isResting ? (
              <div className="rounded-xl border border-orange-300/35 bg-orange-300/10 px-3 py-2 text-sm">
                Rest: {restSecondsLeft}s
                <button
                  type="button"
                  onClick={() => {
                    setRestSecondsLeft(0);
                    setActiveRestExercise(null);
                  }}
                  className="ml-3 text-xs text-zinc-400 underline"
                >
                  Skip
                </button>
              </div>
            ) : null}

            <div className="mt-3 space-y-1 text-xs text-zinc-400">
              {item.loggedSets.length === 0 ? (
                <p>No sets logged yet.</p>
              ) : (
                item.loggedSets.map((set) => (
                  <p key={`${item.exercise.id}-${set.setIndex}`}>
                    Set {set.setIndex}: {set.weight} {session.units} × {set.reps}
                    {set.isFailed ? " (Failed)" : ""}
                  </p>
                ))
              )}
            </div>
          </section>
        );
      })}

      <button onClick={finishWorkout} className="glass-button">
        Finish Workout
      </button>
    </div>
  );
}
