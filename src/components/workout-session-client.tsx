"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/client";

type LoggedSet = {
  setIndex: number;
  weight: number;
  reps: number;
  isFailed: boolean;
};

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
  loggedSets: LoggedSet[];
};

type SessionPayload = {
  session: {
    id: string;
    routineDay: { label: string };
    exercises: SessionExercise[];
    units: "LB" | "KG";
  };
};

type SetInput = {
  weight: number;
  reps: number;
  isFailed: boolean;
};

function roundToUnit(weight: number, units: "LB" | "KG") {
  const step = units === "KG" ? 1.25 : 2.5;
  if (weight <= 0) return 0;
  return Math.round(weight / step) * step;
}

function getNextSetSuggestion(exercise: SessionExercise, units: "LB" | "KG") {
  const baseWeight = exercise.recommendation.recommendedWeight || exercise.loggedSets.at(-1)?.weight || 0;
  const lastSet = exercise.loggedSets.at(-1);

  let suggestedWeight = baseWeight;
  if (lastSet) {
    if (lastSet.isFailed || lastSet.reps < exercise.targetRepRangeLow) {
      suggestedWeight = lastSet.weight * 0.975;
    } else if (lastSet.reps > exercise.targetRepRangeHigh) {
      suggestedWeight = lastSet.weight * 1.025;
    } else {
      suggestedWeight = lastSet.weight;
    }
  }

  return {
    weight: roundToUnit(suggestedWeight, units),
    reps: exercise.recommendation.recommendedRepHigh || exercise.targetRepRangeHigh,
  };
}

function getFirstIncompleteExerciseId(exercises: SessionExercise[]) {
  const incomplete = exercises.find((item) => item.loggedSets.length < item.targetSets);
  return incomplete?.exercise.id ?? exercises[0]?.exercise.id ?? "";
}

function toVideoQuery(exerciseName: string) {
  return `${exerciseName} form tutorial short`;
}

function tutorialSearchUrl(exerciseName: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(toVideoQuery(exerciseName))}`;
}

export function WorkoutSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload["session"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string>("");

  const [activeRestExercise, setActiveRestExercise] = useState<string | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [submittingSetFor, setSubmittingSetFor] = useState<string | null>(null);

  const [setInputs, setSetInputs] = useState<Record<string, SetInput>>({});
  const [tutorialVideoId, setTutorialVideoId] = useState<string | null>(null);
  const [loadingTutorial, setLoadingTutorial] = useState(false);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      setError(null);
      try {
        const data = await jsonFetch<SessionPayload>(`/api/sessions/${sessionId}`);
        setSession(data.session);
        setActiveExerciseId(getFirstIncompleteExerciseId(data.session.exercises));

        const initialInputs: Record<string, SetInput> = {};
        for (const exercise of data.session.exercises) {
          const suggestion = getNextSetSuggestion(exercise, data.session.units);
          initialInputs[exercise.exercise.id] = {
            weight: suggestion.weight,
            reps: suggestion.reps,
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
    if (!session) return;
    if (!activeExerciseId) {
      setActiveExerciseId(getFirstIncompleteExerciseId(session.exercises));
      return;
    }

    const exists = session.exercises.some((item) => item.exercise.id === activeExerciseId);
    if (!exists) setActiveExerciseId(getFirstIncompleteExerciseId(session.exercises));
  }, [session, activeExerciseId]);

  useEffect(() => {
    if (!activeRestExercise || restSecondsLeft <= 0) return;
    const id = setInterval(() => {
      setRestSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [activeRestExercise, restSecondsLeft]);

  const activeExercise = useMemo(
    () => session?.exercises.find((item) => item.exercise.id === activeExerciseId) ?? null,
    [session, activeExerciseId],
  );

  useEffect(() => {
    if (!activeExercise) return;
    const exerciseName = activeExercise.exercise.name;

    let cancelled = false;

    async function loadTutorial() {
      setLoadingTutorial(true);
      setTutorialVideoId(null);

      try {
        const data = await jsonFetch<{ videoId: string }>(
          `/api/exercises/tutorial?q=${encodeURIComponent(toVideoQuery(exerciseName))}`,
        );

        if (!cancelled) {
          setTutorialVideoId(data.videoId);
        }
      } catch {
        if (!cancelled) {
          setTutorialVideoId(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingTutorial(false);
        }
      }
    }

    loadTutorial();

    return () => {
      cancelled = true;
    };
  }, [activeExercise]);

  const totalTargetSets = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((sum, item) => sum + item.targetSets, 0);
  }, [session]);

  const loggedSetCount = useMemo(() => {
    if (!session) return 0;
    return session.exercises.reduce((sum, item) => sum + item.loggedSets.length, 0);
  }, [session]);

  const progressPercent = totalTargetSets ? Math.min(100, Math.round((loggedSetCount / totalTargetSets) * 100)) : 0;
  const activeSetNumber = activeExercise ? Math.min(activeExercise.loggedSets.length + 1, activeExercise.targetSets) : 1;
  const allExercisesComplete = !!session?.exercises.every((item) => item.loggedSets.length >= item.targetSets);
  const isResting = !!activeExercise && activeRestExercise === activeExercise.exercise.id && restSecondsLeft > 0;
  const completedExercisesCount = session?.exercises.filter((item) => item.loggedSets.length >= item.targetSets).length ?? 0;

  async function refreshSession() {
    const data = await jsonFetch<SessionPayload>(`/api/sessions/${sessionId}`);
    setSession(data.session);
    return data.session;
  }

  function focusNextIncompleteExercise(nextSession: SessionPayload["session"]) {
    const nextIncomplete = nextSession.exercises.find((item) => item.loggedSets.length < item.targetSets);
    if (nextIncomplete) {
      setActiveExerciseId(nextIncomplete.exercise.id);
    }
  }

  async function logSet() {
    if (!session || !activeExercise) return;

    const exerciseId = activeExercise.exercise.id;
    const values = setInputs[exerciseId];
    if (!values) return;

    const nextSetIndex = activeExercise.loggedSets.length + 1;
    if (nextSetIndex > activeExercise.targetSets) return;

    setSubmittingSetFor(exerciseId);
    setError(null);

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

      const updatedSession = await refreshSession();
      const updatedExercise = updatedSession.exercises.find((item) => item.exercise.id === exerciseId);
      if (!updatedExercise) return;

      const nextSuggestion = getNextSetSuggestion(updatedExercise, updatedSession.units);
      setSetInputs((prev) => ({
        ...prev,
        [exerciseId]: {
          weight: nextSuggestion.weight,
          reps: nextSuggestion.reps,
          isFailed: false,
        },
      }));

      setActiveRestExercise(exerciseId);
      setRestSecondsLeft(updatedExercise.exercise.defaultRestSec || 90);

      if (updatedExercise.loggedSets.length >= updatedExercise.targetSets) {
        focusNextIncompleteExercise(updatedSession);
      }
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
    return <p className="text-sm text-zinc-300/80">Loading session...</p>;
  }

  if (error && !session) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  if (!session || !activeExercise) {
    return <p className="text-sm text-zinc-300/80">No active workout found.</p>;
  }

  const input = setInputs[activeExercise.exercise.id] ?? {
    weight: getNextSetSuggestion(activeExercise, session.units).weight,
    reps: getNextSetSuggestion(activeExercise, session.units).reps,
    isFailed: false,
  };

  const confidencePercent = Math.round(activeExercise.recommendation.confidenceScore * 100);
  const canLogSet = activeExercise.loggedSets.length < activeExercise.targetSets;

  return (
    <div className="space-y-3 pb-10">
      <header className="glass-card-strong rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">{session.routineDay.label}</p>
        <h1 className="text-2xl font-bold text-white">Coach Mode</h1>
        <p className="text-sm text-zinc-200/80">One exercise at a time. One set at a time.</p>

        <div className="mt-3 overflow-hidden rounded-full border border-white/15 bg-white/8">
          <div className="h-2 bg-gradient-to-r from-red-700 to-orange-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1 text-xs text-zinc-300/75">Progress: {loggedSetCount}/{totalTargetSets} sets</p>
      </header>

      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-semibold text-white">{activeExercise.exercise.name}</p>
          <span className="glass-pill px-2 py-1 text-xs text-zinc-100">Set {activeSetNumber}/{activeExercise.targetSets}</span>
        </div>

        <p className="mt-1 text-xs text-zinc-200/80">
          Target reps: {activeExercise.targetRepRangeLow}-{activeExercise.targetRepRangeHigh}
        </p>

        <div className="mt-3 rounded-xl border border-white/15 bg-white/6 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-300/70">Coach Recommendation</p>
          <p className="mt-1 text-sm text-white">
            {activeExercise.recommendation.recommendedWeight || "—"} {session.units} • {activeExercise.recommendation.recommendedRepLow}-{activeExercise.recommendation.recommendedRepHigh} reps
          </p>
          <p className="mt-1 text-xs text-zinc-300/75">Confidence: {confidencePercent}%</p>
          <p className="mt-1 text-xs text-zinc-300/70">{activeExercise.recommendation.reasonText}</p>
        </div>

        <div className="mt-3 rounded-xl border border-white/15 bg-black/30 p-2">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-zinc-300/70">Movement Demo</p>
          {loadingTutorial ? (
            <div className="h-52 rounded-lg border border-white/15 bg-white/6 px-3 py-2 text-sm text-zinc-300/80">
              Loading tutorial video...
            </div>
          ) : tutorialVideoId ? (
            <div className="overflow-hidden rounded-lg border border-white/15">
              <iframe
                title={`${activeExercise.exercise.name} tutorial`}
                src={`https://www.youtube.com/embed/${tutorialVideoId}?rel=0&modestbranding=1&playsinline=1`}
                className="h-52 w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="rounded-lg border border-white/15 bg-white/6 px-3 py-2">
              <p className="text-sm text-zinc-300/80">Couldn&apos;t load an embeddable tutorial for this exercise.</p>
            </div>
          )}
          {!tutorialVideoId ? (
            <a
              href={tutorialSearchUrl(activeExercise.exercise.name)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-zinc-300 underline"
            >
              Open tutorial in YouTube
            </a>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <label>
            Weight ({session.units})
            <input
              type="number"
              value={input.weight}
              onChange={(e) =>
                setSetInputs((prev) => ({
                  ...prev,
                  [activeExercise.exercise.id]: {
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
                  [activeExercise.exercise.id]: {
                    ...input,
                    reps: Number(e.target.value),
                  },
                }))
              }
              className="glass-input mt-1 px-2 py-1"
            />
          </label>
        </div>

        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-200/85">
          <input
            type="checkbox"
            checked={input.isFailed}
            onChange={(e) =>
              setSetInputs((prev) => ({
                ...prev,
                [activeExercise.exercise.id]: {
                  ...input,
                  isFailed: e.target.checked,
                },
              }))
            }
          />
          Mark this set as failed
        </label>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={logSet}
            disabled={!canLogSet || submittingSetFor === activeExercise.exercise.id}
            className="glass-button"
          >
            {submittingSetFor === activeExercise.exercise.id ? "Logging..." : canLogSet ? "Log Set" : "Exercise Complete"}
          </button>
        </div>

        {isResting ? (
          <div className="mt-3 rounded-xl border border-orange-300/35 bg-orange-300/10 px-3 py-2 text-sm text-zinc-100">
            Rest timer: {restSecondsLeft}s
            <button
              type="button"
              onClick={() => {
                setRestSecondsLeft(0);
                setActiveRestExercise(null);
              }}
              className="ml-3 text-xs text-zinc-200 underline"
            >
              Skip
            </button>
          </div>
        ) : null}

        <div className="mt-3 space-y-1 text-xs text-zinc-300/80">
          {activeExercise.loggedSets.length === 0 ? (
            <p>No sets logged yet.</p>
          ) : (
            activeExercise.loggedSets.map((set) => (
              <p key={`${activeExercise.exercise.id}-${set.setIndex}`}>
                Set {set.setIndex}: {set.weight} {session.units} × {set.reps}
                {set.isFailed ? " (Failed)" : ""}
              </p>
            ))
          )}
        </div>
      </section>

      <details className="glass-card rounded-2xl p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-zinc-100">
          <span>Exercise Queue</span>
          <span className="text-xs text-zinc-300/75">{completedExercisesCount}/{session.exercises.length} complete ▾</span>
        </summary>

        <div className="mt-3 space-y-2">
          {session.exercises.map((item) => {
            const done = item.loggedSets.length >= item.targetSets;
            const active = item.exercise.id === activeExercise.exercise.id;
            return (
              <button
                key={item.exercise.id}
                type="button"
                onClick={() => setActiveExerciseId(item.exercise.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  active ? "bg-white/18 text-white" : "bg-white/6 text-zinc-200/90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{item.exercise.name}</span>
                  <span className={`text-xs ${done ? "text-emerald-300" : "text-zinc-300/75"}`}>
                    {item.loggedSets.length}/{item.targetSets}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </details>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button onClick={finishWorkout} className="glass-button-ghost">
        {allExercisesComplete ? "Finish Workout" : "Finish Workout Early"}
      </button>
    </div>
  );
}
