"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

const PLATE_SIZES: Record<"LB" | "KG", number[]> = {
  LB: [45, 35, 25, 10, 5, 2.5],
  KG: [20, 15, 10, 5, 2.5, 1.25],
};

function barWeightFor(units: "LB" | "KG") {
  return units === "LB" ? 45 : 20;
}

/** Returns plates needed per side for a given total weight. */
function calcPlates(totalWeight: number, units: "LB" | "KG"): number[] {
  let perSide = (totalWeight - barWeightFor(units)) / 2;
  if (perSide <= 0) return [];
  const plates: number[] = [];
  for (const plate of PLATE_SIZES[units]) {
    while (perSide >= plate - 0.001) {
      plates.push(plate);
      perSide -= plate;
      perSide = Math.round(perSide * 1000) / 1000;
    }
  }
  return plates;
}

/** Standard gym plate colours. Index matches PLATE_SIZES order. */
const PLATE_PALETTE = [
  { bg: "bg-red-600",    text: "text-white",     border: "border-red-800" },
  { bg: "bg-blue-600",   text: "text-white",     border: "border-blue-800" },
  { bg: "bg-yellow-400", text: "text-zinc-900",  border: "border-yellow-600" },
  { bg: "bg-green-600",  text: "text-white",     border: "border-green-800" },
  { bg: "bg-zinc-100",   text: "text-zinc-900",  border: "border-zinc-400" },
  { bg: "bg-zinc-600",   text: "text-white",     border: "border-zinc-800" },
];

function plateStyle(plate: number, units: "LB" | "KG") {
  const idx = PLATE_SIZES[units].indexOf(plate);
  return PLATE_PALETTE[idx] ?? PLATE_PALETTE[5];
}

const PLATE_VISUAL_H = ["h-14", "h-12", "h-10", "h-7", "h-5", "h-3"];
const PLATE_VISUAL_W = ["w-3",  "w-3",  "w-2.5","w-2", "w-2", "w-1.5"];

function plateVisual(plate: number, units: "LB" | "KG") {
  const idx = PLATE_SIZES[units].indexOf(plate);
  return { h: PLATE_VISUAL_H[idx] ?? "h-3", w: PLATE_VISUAL_W[idx] ?? "w-2" };
}

type PRInfo = {
  isWeightPR: boolean;
  isE1RMPR: boolean;
  prevBestWeight: number;
  prevBestE1RM: number;
  newE1RM: number;
};

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
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [exerciseCatalog, setExerciseCatalog] = useState<SwapExercise[]>([]);
  const [customOrderIds, setCustomOrderIds] = useState<string[]>([]);
  const [skippedExerciseIds, setSkippedExerciseIds] = useState<string[]>([]);
  const [swapByExerciseId, setSwapByExerciseId] = useState<Record<string, SwapExercise>>({});
  const [swapModeForExerciseId, setSwapModeForExerciseId] = useState<string | null>(null);
  const [swapQuery, setSwapQuery] = useState("");

  const [prInfo, setPrInfo] = useState<(PRInfo & { exerciseName: string }) | null>(null);
  const [showPlatesFor, setShowPlatesFor] = useState<string | null>(null);

  const catalogLoadedRef = useRef(false);

  function loadExerciseCatalog() {
    if (catalogLoadedRef.current) return;
    catalogLoadedRef.current = true;
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
  }

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
      setRestSecondsLeft((seconds) => {
        const next = Math.max(0, seconds - 1);
        if (next === 0) setActiveRestExercise(null);
        return next;
      });
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

  async function openTutorialModal() {
    setShowTutorialModal(true);
    if (tutorialVideoId || loadingTutorial) return;
    const exerciseName = activeExerciseDisplay?.name ?? activeExercise?.exercise.name;
    if (!exerciseName) return;
    setLoadingTutorial(true);
    setTutorialVideoId(null);
    try {
      const data = await jsonFetch<{ videoId: string }>(
        `/api/exercises/tutorial?q=${encodeURIComponent(toVideoQuery(exerciseName))}`,
      );
      setTutorialVideoId(data.videoId);
    } catch {
      setTutorialVideoId(null);
    } finally {
      setLoadingTutorial(false);
    }
  }

  // Reset tutorial state when the active exercise changes so the next exercise loads fresh.
  useEffect(() => {
    setTutorialVideoId(null);
    setShowTutorialModal(false);
  }, [activeExerciseId]);

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
      const setResponse = await jsonFetch<{ set: unknown; pr: PRInfo | null }>(
        `/api/sessions/${sessionId}/sets`,
        {
          method: "POST",
          body: JSON.stringify({
            exerciseId: activeExerciseDisplay?.id ?? exerciseId,
            setIndex: nextSetIndex,
            weight: values.weight,
            reps: values.reps,
            isFailed: values.isFailed,
          }),
        },
      );

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

      // Show PR celebration before starting rest timer.
      if (setResponse.pr && (setResponse.pr.isWeightPR || setResponse.pr.isE1RMPR)) {
        setPrInfo({
          ...setResponse.pr,
          exerciseName: activeExerciseDisplay?.name ?? activeExercise.exercise.name,
        });
      }

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
            <h1 className="text-xl font-bold text-white">Workout Session</h1>
          </div>
          <p className="text-xs text-zinc-300/85">{loggedSetCount}/{totalTargetSets} sets</p>
        </div>

        <p className="mt-2 text-xs text-zinc-300/80">Follow the active exercise, enter your completed set, then tap Log Set.</p>

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
        <p className="mt-1 text-xs text-zinc-300/75">Recommended load confidence: {confidencePercent}%</p>

        <button
          type="button"
          onClick={openTutorialModal}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/12"
        >
          <span>▶</span> Form guide
        </button>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-zinc-300/75">Weight ({session.units})</span>
            <div className="mt-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label="Decrease weight"
                onClick={() =>
                  setSetInputs((prev) => ({
                    ...prev,
                    [activeExercise.exercise.id]: {
                      ...input,
                      weight: Math.max(0, roundToUnit(input.weight - (session.units === "KG" ? 2.5 : 5), session.units)),
                    },
                  }))
                }
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-xl font-bold text-white active:bg-white/20"
              >
                −
              </button>
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
                className="glass-input min-w-0 flex-1 px-1 py-3 text-center text-3xl font-bold tabular-nums"
              />
              <button
                type="button"
                aria-label="Increase weight"
                onClick={() =>
                  setSetInputs((prev) => ({
                    ...prev,
                    [activeExercise.exercise.id]: {
                      ...input,
                      weight: roundToUnit(input.weight + (session.units === "KG" ? 2.5 : 5), session.units),
                    },
                  }))
                }
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-xl font-bold text-white active:bg-white/20"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <span className="text-xs text-zinc-300/75">Reps</span>
            <div className="mt-1.5 flex items-center gap-1">
              <button
                type="button"
                aria-label="Decrease reps"
                onClick={() =>
                  setSetInputs((prev) => ({
                    ...prev,
                    [activeExercise.exercise.id]: {
                      ...input,
                      reps: Math.max(1, input.reps - 1),
                    },
                  }))
                }
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-xl font-bold text-white active:bg-white/20"
              >
                −
              </button>
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
                className="glass-input min-w-0 flex-1 px-1 py-3 text-center text-3xl font-bold tabular-nums"
              />
              <button
                type="button"
                aria-label="Increase reps"
                onClick={() =>
                  setSetInputs((prev) => ({
                    ...prev,
                    [activeExercise.exercise.id]: {
                      ...input,
                      reps: input.reps + 1,
                    },
                  }))
                }
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/8 text-xl font-bold text-white active:bg-white/20"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Plate calculator — small, optional, only shown when toggled */}
        {/* Plate calculator — toggle open, interactive */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() =>
              setShowPlatesFor(
                showPlatesFor === activeExercise.exercise.id ? null : activeExercise.exercise.id,
              )
            }
            className="text-xs text-zinc-400/70 underline decoration-dotted underline-offset-2"
          >
            {showPlatesFor === activeExercise.exercise.id ? "Hide plate loader" : "Load bar"}
          </button>

          {showPlatesFor === activeExercise.exercise.id ? (() => {
            const plates = calcPlates(input.weight, session.units);
            const bar = barWeightFor(session.units);

            const exerciseId = activeExercise!.exercise.id;

            function addPlate(p: number) {
              setSetInputs((prev) => ({
                ...prev,
                [exerciseId]: { ...input, weight: Math.round((input.weight + p * 2) * 1000) / 1000 },
              }));
            }

            function removePlate(p: number) {
              const next = Math.max(bar, Math.round((input.weight - p * 2) * 1000) / 1000);
              setSetInputs((prev) => ({
                ...prev,
                [exerciseId]: { ...input, weight: next },
              }));
            }

            return (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {/* Barbell visual */}
                <div className="flex items-center gap-0 overflow-x-auto px-3 py-4">
                  {/* Left end cap */}
                  <div className="h-5 w-2 shrink-0 rounded-l-sm bg-zinc-400" />
                  {/* Left sleeve */}
                  <div className="h-2 w-5 shrink-0 bg-zinc-500" />
                  {/* Plates — rendered right-to-left so closest to centre is last added */}
                  <div className="flex items-center gap-px">
                    {[...plates].reverse().map((plate, i) => {
                      const { bg, text, border } = plateStyle(plate, session.units);
                      const { h, w } = plateVisual(plate, session.units);
                      return (
                        <button
                          key={i}
                          type="button"
                          title={`Remove ${plate} ${session.units}`}
                          onClick={() => removePlate(plate)}
                          className={`${h} ${w} ${bg} ${text} ${border} shrink-0 cursor-pointer rounded-sm border text-[8px] font-bold transition-opacity hover:opacity-70`}
                        />
                      );
                    })}
                  </div>
                  {/* Knurl / bar centre */}
                  <div className="h-1.5 w-6 shrink-0 bg-zinc-400/50" />
                  {/* Plates right side — mirror of left, also clickable to remove */}
                  <div className="flex items-center gap-px">
                    {plates.map((plate, i) => {
                      const { bg, text, border } = plateStyle(plate, session.units);
                      const { h, w } = plateVisual(plate, session.units);
                      return (
                        <button
                          key={i}
                          type="button"
                          title={`Remove ${plate} ${session.units}`}
                          onClick={() => removePlate(plate)}
                          className={`${h} ${w} ${bg} ${text} ${border} shrink-0 cursor-pointer rounded-sm border text-[8px] font-bold transition-opacity hover:opacity-70`}
                        />
                      );
                    })}
                  </div>
                  {/* Right sleeve + cap */}
                  <div className="h-2 w-5 shrink-0 bg-zinc-500" />
                  <div className="h-5 w-2 shrink-0 rounded-r-sm bg-zinc-400" />
                </div>

                {/* Weight label */}
                <p className="px-3 text-center text-xs text-zinc-400/80">
                  {plates.length === 0
                    ? `Bar only (${bar} ${session.units})`
                    : `${bar} bar + ${plates.join(" + ")} per side = `}
                  <span className="font-semibold text-white">{input.weight} {session.units}</span>
                </p>

                {/* Plate add buttons */}
                <div className="px-3 pb-3 pt-3">
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400/70">Tap to add both sides</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {PLATE_SIZES[session.units].map((plate) => {
                      const { bg, text, border } = plateStyle(plate, session.units);
                      return (
                        <button
                          key={plate}
                          type="button"
                          onClick={() => addPlate(plate)}
                          className={`${bg} ${text} ${border} flex h-12 flex-col items-center justify-center rounded-xl border-b-2 text-[10px] font-bold active:scale-95`}
                        >
                          <span>+{plate}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSetInputs((prev) => ({
                        ...prev,
                        [exerciseId]: { ...input, weight: bar },
                      }))
                    }
                    className="mt-2 w-full text-center text-xs text-zinc-500 underline decoration-dotted"
                  >
                    Reset to bar ({bar} {session.units})
                  </button>
                </div>
              </div>
            );
          })() : null}
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
            <span>Exercise Queue ({completedExercisesCount}/{session.exercises.length})</span>
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
                      loadExerciseCatalog();
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

      {prInfo ? (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/92 px-6 backdrop-blur-xl"
          onClick={() => setPrInfo(null)}
        >
          {/* Radiant glow behind the text */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          </div>

          <p className="relative text-[11px] uppercase tracking-[0.32em] text-orange-300/90">New Personal Record</p>
          <p className="relative mt-3 text-center text-4xl font-black text-white">{prInfo.exerciseName}</p>

          <div className="relative mt-8 flex gap-5">
            {prInfo.isWeightPR ? (
              <div className="glass-card-strong rounded-2xl px-6 py-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-orange-300/80">Weight</p>
                <p className="mt-1 text-3xl font-bold text-white tabular-nums">{prInfo.prevBestWeight > 0 ? `+${(session?.units ?? "LB")}` : ""}</p>
                <p className="text-xs text-zinc-300/70">All-time best</p>
              </div>
            ) : null}
            {prInfo.isE1RMPR ? (
              <div className="glass-card-strong rounded-2xl px-6 py-4 text-center">
                <p className="text-[10px] uppercase tracking-widest text-orange-300/80">Est. 1RM</p>
                <p className="mt-1 text-3xl font-bold text-white tabular-nums">{prInfo.newE1RM}</p>
                <p className="text-xs text-zinc-300/70">
                  {prInfo.prevBestE1RM > 0 ? `↑ from ${prInfo.prevBestE1RM}` : "First record"}
                </p>
              </div>
            ) : null}
          </div>

          <p className="relative mt-8 text-sm text-zinc-300/70">Tap anywhere to continue</p>
        </div>
      ) : null}

      {isResting ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-orange-300/80">Rest Timer</p>
          <p className="mt-1 text-base font-semibold text-white/90">
            {activeExerciseDisplay?.name ?? activeExercise.exercise.name}
          </p>

          {/* Circular progress ring */}
          <div className="relative mt-8 flex items-center justify-center">
            <svg width="220" height="220" className="-rotate-90">
              {/* Track */}
              <circle
                cx="110"
                cy="110"
                r="96"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="8"
              />
              {/* Progress arc */}
              <circle
                cx="110"
                cy="110"
                r="96"
                fill="none"
                stroke="url(#restGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 96}`}
                strokeDashoffset={`${2 * Math.PI * 96 * (1 - restProgress / 100)}`}
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="restGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b91c1c" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <p className="text-7xl font-bold tracking-tight text-white tabular-nums">{formatSeconds(restSecondsLeft)}</p>
              <p className="mt-1 text-xs text-zinc-400">remaining</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-zinc-300/75">
            {restSecondsLeft > 30
              ? "Breathe and recover."
              : restSecondsLeft > 10
              ? "Almost ready — start getting set."
              : "Get under the bar."}
          </p>

          {activeExercise && activeExercise.loggedSets.length < activeExercise.targetSets ? (
            <p className="mt-2 text-xs text-zinc-400/70">
              Next: Set {activeExercise.loggedSets.length + 1} of {activeExercise.targetSets}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setRestSecondsLeft(0);
              setActiveRestExercise(null);
            }}
            className="glass-button mt-8 px-8"
          >
            Skip Rest
          </button>
        </div>
      ) : null}

      {showTutorialModal ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl"
          onClick={() => setShowTutorialModal(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-safe-top pb-4 pt-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-orange-300/70">Form Guide</p>
              <p className="mt-0.5 text-lg font-bold text-white">
                {activeExerciseDisplay?.name ?? activeExercise?.exercise.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTutorialModal(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-zinc-300"
            >
              ✕
            </button>
          </div>

          {/* Video area */}
          <div
            className="mx-5 overflow-hidden rounded-2xl border border-white/12"
            onClick={(e) => e.stopPropagation()}
          >
            {loadingTutorial ? (
              <div className="flex h-52 items-center justify-center bg-white/4">
                <p className="text-sm text-zinc-400">Loading…</p>
              </div>
            ) : tutorialVideoId ? (
              <iframe
                title={`${activeExerciseDisplay?.name ?? activeExercise?.exercise.name} tutorial`}
                src={`https://www.youtube.com/embed/${tutorialVideoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`}
                className="h-52 w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <div className="flex h-52 flex-col items-center justify-center gap-3 bg-white/4 px-6 text-center">
                <p className="text-sm text-zinc-400">No embeddable video found.</p>
                <a
                  href={tutorialSearchUrl(activeExerciseDisplay?.name ?? activeExercise?.exercise.name ?? "")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-orange-300 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Search on YouTube →
                </a>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">Tap outside to close</p>
        </div>
      ) : null}
    </div>
  );
}
