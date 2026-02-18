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
    preferredRestSeconds: number | null;
  };
};

type SetInput = {
  weight: number;
  reps: number;
  isFailed: boolean;
};

type SwapExercise = {
  id: string;
  name: string;
  defaultRestSec: number;
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

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function WorkoutSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload["session"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string>("");

  const [activeRestExercise, setActiveRestExercise] = useState<string | null>(null);
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restDurationSeconds, setRestDurationSeconds] = useState(0);
  const [submittingSetFor, setSubmittingSetFor] = useState<string | null>(null);

  const [setInputs, setSetInputs] = useState<Record<string, SetInput>>({});
  const [tutorialVideoId, setTutorialVideoId] = useState<string | null>(null);
  const [loadingTutorial, setLoadingTutorial] = useState(false);
  const [exerciseCatalog, setExerciseCatalog] = useState<SwapExercise[]>([]);
  const [customOrderIds, setCustomOrderIds] = useState<string[]>([]);
  const [skippedExerciseIds, setSkippedExerciseIds] = useState<string[]>([]);
  const [swapByExerciseId, setSwapByExerciseId] = useState<Record<string, SwapExercise>>({});
  const [swapModeForExerciseId, setSwapModeForExerciseId] = useState<string | null>(null);
  const [swapQuery, setSwapQuery] = useState("");

  useEffect(() => {
    jsonFetch<{ exercises: Array<{ id: string; name: string; defaultRestSec?: number }> }>("/api/exercises")
      .then((data) => {
        setExerciseCatalog(
          data.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            defaultRestSec: exercise.defaultRestSec ?? 90,
          })),
        );
      })
      .catch(() => setExerciseCatalog([]));
  }, []);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      setError(null);
      try {
        const data = await jsonFetch<SessionPayload>(`/api/sessions/${sessionId}`);
        setSession(data.session);
        setActiveExerciseId(getFirstIncompleteExerciseId(data.session.exercises));
        setCustomOrderIds((previous) => {
          const latestIds = data.session.exercises.map((item) => item.exercise.id);
          if (!previous.length) return latestIds;
          const preserved = previous.filter((id) => latestIds.includes(id));
          const missing = latestIds.filter((id) => !preserved.includes(id));
          return [...preserved, ...missing];
        });

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

  const orderedExercises = useMemo(() => {
    if (!session) return [];
    const map = new Map(session.exercises.map((item) => [item.exercise.id, item]));
    const ordered = customOrderIds.map((id) => map.get(id)).filter(Boolean) as SessionExercise[];
    const missing = session.exercises.filter((item) => !customOrderIds.includes(item.exercise.id));
    return [...ordered, ...missing];
  }, [session, customOrderIds]);

  const activeExerciseDisplay = activeExercise
    ? swapByExerciseId[activeExercise.exercise.id] ?? activeExercise.exercise
    : null;

  useEffect(() => {
    if (!activeExerciseDisplay) return;
    const exerciseName = activeExerciseDisplay.name;

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
  }, [activeExerciseDisplay]);

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
  const allExercisesComplete =
    !!session?.exercises.every(
      (item) => item.loggedSets.length >= item.targetSets || skippedExerciseIds.includes(item.exercise.id),
    );
  const isResting = !!activeExercise && activeRestExercise === activeExercise.exercise.id && restSecondsLeft > 0;
  const completedExercisesCount =
    session?.exercises.filter(
      (item) => item.loggedSets.length >= item.targetSets || skippedExerciseIds.includes(item.exercise.id),
    ).length ?? 0;
  const restProgress = restDurationSeconds > 0
    ? Math.min(100, Math.round(((restDurationSeconds - restSecondsLeft) / restDurationSeconds) * 100))
    : 0;

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
          exerciseId: activeExerciseDisplay?.id ?? exerciseId,
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

      const rest = updatedSession.preferredRestSeconds ?? (activeExerciseDisplay?.defaultRestSec || updatedExercise.exercise.defaultRestSec || 90);
      setActiveRestExercise(exerciseId);
      setRestDurationSeconds(rest);
      setRestSecondsLeft(rest);

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
  const swapResults = swapQuery.trim()
    ? exerciseCatalog
        .filter((exercise) => exercise.name.toLowerCase().includes(swapQuery.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  function moveExercise(exerciseId: string, direction: "up" | "down") {
    setCustomOrderIds((previous) => {
      const next = previous.length ? [...previous] : orderedExercises.map((item) => item.exercise.id);
      const index = next.indexOf(exerciseId);
      if (index < 0) return next;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return next;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function skipExercise(exerciseId: string) {
    setSkippedExerciseIds((previous) => (previous.includes(exerciseId) ? previous : [...previous, exerciseId]));

    if (!activeExercise) return;
    if (exerciseId !== activeExercise.exercise.id) return;

    const next = orderedExercises.find(
      (item) =>
        item.exercise.id !== exerciseId &&
        item.loggedSets.length < item.targetSets &&
        !skippedExerciseIds.includes(item.exercise.id),
    );
    if (next) {
      setActiveExerciseId(next.exercise.id);
    }
  }

  return (
    <div className="space-y-2 pb-4">
      <header className="glass-card-strong rounded-2xl p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-200/70">{session.routineDay.label}</p>
            <h1 className="text-xl font-bold text-white">Coach Mode</h1>
          </div>
          <p className="text-xs text-zinc-300/85">{loggedSetCount}/{totalTargetSets} sets</p>
        </div>

        <div className="mt-2 overflow-hidden rounded-full border border-white/15 bg-white/8">
          <div className="h-1.5 bg-gradient-to-r from-red-700 to-orange-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      <section className="glass-card rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-semibold text-white">{activeExerciseDisplay?.name ?? activeExercise.exercise.name}</p>
          <span className="glass-pill px-2 py-1 text-xs text-zinc-100">Set {activeSetNumber}/{activeExercise.targetSets}</span>
        </div>

        <p className="mt-1 text-xs text-zinc-200/80">
          Target reps: {activeExercise.targetRepRangeLow}-{activeExercise.targetRepRangeHigh}
        </p>

        <div className="mt-3 rounded-xl border border-white/15 bg-black/30 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-zinc-300/70">Movement Demo</p>
          {loadingTutorial ? (
            <div className="h-56 rounded-lg border border-white/15 bg-white/6 px-3 py-2 text-sm text-zinc-300/80">
              Loading tutorial video...
            </div>
          ) : tutorialVideoId ? (
            <div className="overflow-hidden rounded-lg border border-white/15">
              <iframe
                title={`${activeExerciseDisplay?.name ?? activeExercise.exercise.name} tutorial`}
                src={`https://www.youtube.com/embed/${tutorialVideoId}?rel=0&modestbranding=1&playsinline=1`}
                className="h-56 w-full"
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
              href={tutorialSearchUrl(activeExerciseDisplay?.name ?? activeExercise.exercise.name)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-zinc-300 underline"
            >
              Open tutorial in YouTube
            </a>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label>
            <span className="text-xs text-zinc-300/75">Weight ({session.units})</span>
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
              className="glass-input mt-1.5 px-4 py-3 text-center text-3xl font-bold tabular-nums"
            />
          </label>
          <label>
            <span className="text-xs text-zinc-300/75">Reps</span>
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
              className="glass-input mt-1.5 px-4 py-3 text-center text-3xl font-bold tabular-nums"
            />
          </label>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-white/12 bg-white/5 px-3 py-2.5">
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
            className="h-5 w-5 cursor-pointer rounded border-white/20 bg-white/10 text-red-500 focus:ring-2 focus:ring-red-500/50 focus:ring-offset-0"
          />
          <span className="text-sm text-zinc-200">Mark this set as failed</span>
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={logSet}
            disabled={!canLogSet || submittingSetFor === activeExercise.exercise.id}
            className="glass-button py-3 text-base font-semibold"
          >
            {submittingSetFor === activeExercise.exercise.id ? "Logging..." : canLogSet ? "Log Set" : "Exercise Complete"}
          </button>
        </div>

        <div className="mt-2 space-y-1 text-xs text-zinc-300/80">
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

      <div className="grid grid-cols-2 gap-2">
        <details className="glass-card rounded-xl p-2 text-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs text-zinc-200">
            <span>Queue ({completedExercisesCount}/{session.exercises.length})</span>
            <span>▾</span>
          </summary>

        <div className="mt-2 space-y-1">
          {orderedExercises.map((item, index) => {
            const done = item.loggedSets.length >= item.targetSets || skippedExerciseIds.includes(item.exercise.id);
            const active = item.exercise.id === activeExercise.exercise.id;
            const displayExercise = swapByExerciseId[item.exercise.id] ?? item.exercise;
            return (
              <div key={item.exercise.id} className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${
                active ? "bg-white/18 text-white" : "bg-white/6 text-zinc-200/90"
              }`}>
                <button type="button" onClick={() => setActiveExerciseId(item.exercise.id)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <span>{displayExercise.name}</span>
                    <span className={`text-xs ${done ? "text-emerald-300" : "text-zinc-300/75"}`}>
                      {item.loggedSets.length}/{item.targetSets}
                    </span>
                  </div>
                </button>

                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <button type="button" onClick={() => moveExercise(item.exercise.id, "up")} disabled={index === 0} className="glass-pill px-2 py-1 disabled:opacity-40">↑ Up</button>
                  <button type="button" onClick={() => moveExercise(item.exercise.id, "down")} disabled={index === orderedExercises.length - 1} className="glass-pill px-2 py-1 disabled:opacity-40">↓ Down</button>
                  <button type="button" onClick={() => skipExercise(item.exercise.id)} disabled={done} className="glass-pill px-2 py-1 disabled:opacity-40">Skip</button>
                  <button
                    type="button"
                    onClick={() => {
                      setSwapModeForExerciseId(item.exercise.id);
                      setSwapQuery("");
                    }}
                    className="glass-pill px-2 py-1"
                  >
                    Swap
                  </button>
                </div>

                {swapModeForExerciseId === item.exercise.id ? (
                  <div className="mt-2 space-y-2">
                    <input
                      value={swapQuery}
                      onChange={(event) => setSwapQuery(event.target.value)}
                      placeholder="Search replacement exercise"
                      className="glass-input px-2 py-1 text-xs"
                    />
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {swapResults.map((exercise) => (
                        <button
                          key={exercise.id}
                          type="button"
                          onClick={() => {
                            setSwapByExerciseId((previous) => ({
                              ...previous,
                              [item.exercise.id]: exercise,
                            }));
                            setSwapModeForExerciseId(null);
                            setSwapQuery("");
                          }}
                          className="block w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-left text-xs text-zinc-200 hover:bg-white/10"
                        >
                          {exercise.name}
                        </button>
                      ))}
                      {swapQuery.trim().length > 0 && swapResults.length === 0 ? (
                        <p className="text-xs text-zinc-300/70">No matching exercises.</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        </details>

        <button onClick={finishWorkout} className="glass-card rounded-xl p-2 text-xs text-zinc-200 hover:bg-white/8">
          {allExercisesComplete ? "Finish" : "Finish Early"}
        </button>
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {isResting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-5 backdrop-blur-md">
          <div className="glass-card-strong w-full max-w-md rounded-3xl p-6 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-orange-200/80">Rest Timer</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{activeExerciseDisplay?.name ?? activeExercise.exercise.name}</h2>

            <div className="mt-6 overflow-hidden rounded-full border border-white/20 bg-white/8">
              <div
                className="h-2 bg-gradient-to-r from-red-700 via-orange-500 to-amber-400 transition-all"
                style={{ width: `${restProgress}%` }}
              />
            </div>

            <p className="mt-6 text-6xl font-bold tracking-tight text-white">{formatSeconds(restSecondsLeft)}</p>
            <p className="mt-2 text-sm text-zinc-300/80">Breathe. Reset. Next set incoming.</p>

            <button
              type="button"
              onClick={() => {
                setRestSecondsLeft(0);
                setActiveRestExercise(null);
              }}
              className="glass-button mt-6"
            >
              Skip Rest
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
