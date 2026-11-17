"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActiveExercise } from "@/components/workout/active-exercise";
import { ExerciseQueue, type QueueItem, type SwapExercise } from "@/components/workout/exercise-queue";
import { PROverlay, type PRCelebration } from "@/components/workout/pr-overlay";
import { RestBar } from "@/components/workout/rest-bar";
import { TutorialModal } from "@/components/workout/tutorial-modal";
import { Button } from "@/components/ui/button";
import { jsonFetch } from "@/lib/client";
import {
  getNextSetSuggestion,
  type LoggedSet,
  type SessionExercise,
  type SessionPayload,
  type SetInput,
} from "@/lib/workout-helpers";

type PRResponse = {
  isWeightPR: boolean;
  isE1RMPR: boolean;
  prevBestWeight: number;
  prevBestE1RM: number;
  newE1RM: number;
};

function firstIncompleteId(exercises: SessionExercise[]) {
  return (exercises.find((e) => e.loggedSets.length < e.targetSets) ?? exercises[0])?.exercise.id ?? "";
}

export function WorkoutSessionClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload["session"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("");
  const [setInputs, setSetInputs] = useState<Record<string, SetInput>>({});
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [swapBy, setSwapBy] = useState<Record<string, SwapExercise>>({});
  const [extraSets, setExtraSets] = useState<Record<string, LoggedSet[]>>({});
  const [catalog, setCatalog] = useState<SwapExercise[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [pr, setPr] = useState<PRCelebration | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const submittingRef = useRef(false);
  const catalogLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await jsonFetch<SessionPayload>(`/api/sessions/${sessionId}`);
        if (cancelled) return;
        const s = data.session;
        setSession(s);
        setActiveId(firstIncompleteId(s.exercises));
        setOrderIds(s.exercises.map((e) => e.exercise.id));
        const inputs: Record<string, SetInput> = {};
        for (const e of s.exercises) {
          const sug = getNextSetSuggestion(e, s.units);
          inputs[e.exercise.id] = { weight: sug.weight, reps: sug.reps, isFailed: false };
        }
        setSetInputs(inputs);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load session");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const displayOf = useCallback(
    (item: SessionExercise) => swapBy[item.exercise.id] ?? item.exercise,
    [swapBy],
  );
  const loggedOf = useCallback(
    (item: SessionExercise): LoggedSet[] =>
      swapBy[item.exercise.id] ? [...item.loggedSets, ...(extraSets[item.exercise.id] ?? [])] : item.loggedSets,
    [swapBy, extraSets],
  );
  const isDone = useCallback(
    (item: SessionExercise) => loggedOf(item).length >= item.targetSets || skippedIds.includes(item.exercise.id),
    [loggedOf, skippedIds],
  );

  const ordered = useMemo(() => {
    if (!session) return [];
    const map = new Map(session.exercises.map((e) => [e.exercise.id, e]));
    const inOrder = orderIds.map((id) => map.get(id)).filter(Boolean) as SessionExercise[];
    return [...inOrder, ...session.exercises.filter((e) => !orderIds.includes(e.exercise.id))];
  }, [session, orderIds]);

  const active = ordered.find((e) => e.exercise.id === activeId) ?? null;

  const queueItems: QueueItem[] = ordered.map((e) => ({
    id: e.exercise.id,
    name: displayOf(e).name,
    logged: loggedOf(e).length,
    target: e.targetSets,
    done: isDone(e),
    skipped: skippedIds.includes(e.exercise.id),
  }));

  function nextCandidate(fromId: string): SessionExercise | null {
    const i = ordered.findIndex((e) => e.exercise.id === fromId);
    const rotated = [...ordered.slice(i + 1), ...ordered.slice(0, Math.max(i, 0))];
    return rotated.find((e) => e.exercise.id !== fromId && !isDone(e)) ?? null;
  }

  async function refreshSession() {
    const data = await jsonFetch<SessionPayload>(`/api/sessions/${sessionId}`);
    setSession(data.session);
    return data.session;
  }

  function loadCatalog() {
    if (catalogLoadedRef.current) return;
    catalogLoadedRef.current = true;
    jsonFetch<{ exercises: Array<{ id: string; name: string; defaultRestSec?: number }> }>("/api/exercises")
      .then((d) =>
        setCatalog(d.exercises.map((e) => ({ id: e.id, name: e.name, defaultRestSec: e.defaultRestSec ?? 90 }))),
      )
      .catch(() => setCatalog([]));
  }

  async function logSet() {
    if (submittingRef.current || !session || !active) return;
    const id = active.exercise.id;
    const values = setInputs[id];
    if (!values || values.weight === "" || values.reps === "" || values.reps < 1) return;

    const before = loggedOf(active);
    const setIndex = before.length + 1;
    if (setIndex > active.targetSets) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const display = displayOf(active);
      const res = await jsonFetch<{ set: unknown; pr: PRResponse | null }>(`/api/sessions/${sessionId}/sets`, {
        method: "POST",
        body: JSON.stringify({
          exerciseId: display.id,
          setIndex,
          weight: values.weight,
          reps: values.reps,
          isFailed: values.isFailed,
        }),
      });

      const newSet: LoggedSet = { setIndex, weight: values.weight, reps: values.reps, isFailed: values.isFailed };
      let updatedLogged: LoggedSet[];
      let units = session.units;
      let preferredRest = session.preferredRestSeconds;
      if (swapBy[id]) {
        setExtraSets((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), newSet] }));
        updatedLogged = [...before, newSet];
      } else {
        const fresh = await refreshSession();
        units = fresh.units;
        preferredRest = fresh.preferredRestSeconds;
        updatedLogged = fresh.exercises.find((e) => e.exercise.id === id)?.loggedSets ?? [...before, newSet];
      }

      const sug = getNextSetSuggestion({ ...active, loggedSets: updatedLogged }, units);
      setSetInputs((prev) => ({ ...prev, [id]: { weight: sug.weight, reps: sug.reps, isFailed: false } }));

      if (res.pr && (res.pr.isWeightPR || res.pr.isE1RMPR)) {
        setPr({ ...res.pr, exerciseName: display.name, units: units.toLowerCase(), newWeight: values.weight });
      }

      const seconds = preferredRest ?? (display.defaultRestSec || active.exercise.defaultRestSec || 90);
      setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });

      if (updatedLogged.length >= active.targetSets) {
        const next = nextCandidate(id);
        if (next) setActiveId(next.exercise.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not log set";
      if (message.toLowerCase().includes("already logged")) {
        await refreshSession().catch(() => null);
      } else {
        setError(message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function undoSet() {
    if (submittingRef.current || !session || !active) return;
    const id = active.exercise.id;
    const before = loggedOf(active);
    if (before.length === 0) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await jsonFetch(`/api/sessions/${sessionId}/sets`, {
        method: "DELETE",
        body: JSON.stringify({ exerciseId: displayOf(active).id }),
      });
      let remaining: LoggedSet[];
      if (swapBy[id]) {
        const extras = (extraSets[id] ?? []).slice(0, -1);
        setExtraSets((prev) => ({ ...prev, [id]: extras }));
        remaining = [...active.loggedSets, ...extras];
      } else {
        const fresh = await refreshSession();
        remaining = fresh.exercises.find((e) => e.exercise.id === id)?.loggedSets ?? before.slice(0, -1);
      }
      const sug = getNextSetSuggestion({ ...active, loggedSets: remaining }, session.units);
      setSetInputs((prev) => ({ ...prev, [id]: { weight: sug.weight, reps: sug.reps, isFailed: false } }));
      setRest(null);
      setActiveId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo set");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function finishWorkout() {
    if (finishing) return;
    setFinishing(true);
    try {
      await jsonFetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ endedAt: new Date().toISOString() }),
      });
      router.push(`/workout/summary/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish workout");
      setFinishing(false);
    }
  }

  function move(id: string, direction: "up" | "down") {
    setOrderIds(() => {
      const next = ordered.map((e) => e.exercise.id);
      const i = next.indexOf(id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function skip(id: string) {
    setSkippedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (id === activeId) {
      const next = nextCandidate(id);
      if (next) setActiveId(next.exercise.id);
    }
  }

  const stopRest = useCallback(() => setRest(null), []);

  if (loading) return <p className="text-sm text-muted-2">Loading workout…</p>;
  if (error && !session) return <p className="text-sm text-danger">{error}</p>;
  if (!session || !active) return <p className="text-sm text-muted-2">No active workout found.</p>;

  const totalSets = session.exercises.reduce((sum, e) => sum + e.targetSets, 0);
  const loggedSets = session.exercises.reduce((sum, e) => sum + loggedOf(e).length, 0);
  const pct = totalSets ? Math.min(100, Math.round((loggedSets / totalSets) * 100)) : 0;
  const allDone = ordered.every(isDone);
  const display = displayOf(active);
  const position = `Exercise ${ordered.findIndex((e) => e.exercise.id === activeId) + 1} of ${ordered.length} · ${session.routineDay.label}`;
  const nextItem = nextCandidate(activeId);
  const input = setInputs[activeId] ?? { weight: "", reps: "", isFailed: false };

  const queue = (
    <ExerciseQueue
      items={queueItems}
      activeId={activeId}
      catalog={catalog}
      onLoadCatalog={loadCatalog}
      onSelect={setActiveId}
      onMove={move}
      onSkip={skip}
      onSwap={(id, replacement) => setSwapBy((prev) => ({ ...prev, [id]: replacement }))}
    />
  );

  return (
    <div className="pb-40 lg:pb-32">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/home" className="inline-flex min-h-10 items-center text-sm font-bold text-muted-2">
          ‹ Home
        </Link>
        <span className="tabular text-xs font-bold text-muted-2">
          {loggedSets}/{totalSets} sets
        </span>
        <button
          type="button"
          onClick={finishWorkout}
          disabled={finishing}
          className="inline-flex min-h-10 items-center text-sm font-bold text-accent disabled:opacity-50"
        >
          {allDone ? "Finish" : "Finish early"}
        </button>
      </div>
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">{queue}</aside>

        <div className="space-y-4">
          <ActiveExercise
            position={position}
            name={display.name}
            repLow={active.targetRepRangeLow}
            repHigh={active.targetRepRangeHigh}
            targetSets={active.targetSets}
            logged={loggedOf(active)}
            coachWeight={active.recommendation.recommendedWeight}
            coachReason={active.recommendation.reasonText}
            units={session.units}
            input={input}
            submitting={submitting}
            onInputChange={(next) => setSetInputs((prev) => ({ ...prev, [activeId]: next }))}
            onLog={logSet}
            onUndo={undoSet}
            onOpenGuide={() => setGuideOpen(true)}
          />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <details className="rounded-2xl border border-line bg-surface p-3 lg:hidden">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-bold">
              <span>
                Exercise queue ({ordered.filter(isDone).length}/{ordered.length})
              </span>
              <span aria-hidden>▾</span>
            </summary>
            <div className="mt-3">{queue}</div>
          </details>
        </div>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
        <div className="mx-auto max-w-md pb-3 md:max-w-2xl lg:max-w-5xl">
          {rest ? (
            <RestBar
              key={rest.endsAt}
              endsAt={rest.endsAt}
              totalSeconds={rest.total}
              onAddTime={() => setRest((r) => (r ? { endsAt: r.endsAt + 15_000, total: r.total + 15 } : r))}
              onSkip={stopRest}
              onDone={stopRest}
            />
          ) : allDone ? (
            <Button size="lg" onClick={finishWorkout} disabled={finishing}>
              {finishing ? "Finishing…" : "Finish workout"}
            </Button>
          ) : nextItem ? (
            <Button variant="ghost" size="lg" onClick={() => setActiveId(nextItem.exercise.id)}>
              Next: {displayOf(nextItem).name} →
            </Button>
          ) : null}
        </div>
      </div>

      {guideOpen ? <TutorialModal name={display.name} onClose={() => setGuideOpen(false)} /> : null}
      {pr ? <PROverlay pr={pr} onClose={() => setPr(null)} /> : null}
    </div>
  );
}
