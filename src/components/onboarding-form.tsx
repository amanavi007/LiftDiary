"use client";

import { CoachingStyle, ExperienceLevel, Goal, SplitType, Units } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/client";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  movementType: string;
};

type RoutineExercise = {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
};

type RoutineDay = {
  label: string;
  exercises: RoutineExercise[];
};

type RecommendedDay = {
  label: string;
  defaultRepLow: number;
  defaultRepHigh: number;
  defaultSets: number;
  recommendedExercises: Exercise[];
};

type CurrentRoutinePayload = {
  routine: {
    name: string;
    splitType: SplitType;
    days: Array<{
      label: string;
      exercises: Array<{
        exerciseId: string;
        targetSets: number;
        targetRepRangeLow: number;
        targetRepRangeHigh: number;
        exercise: {
          id: string;
          name: string;
        };
      }>;
    }>;
  } | null;
};

const GOALS: Goal[] = ["STRENGTH", "HYPERTROPHY", "ENDURANCE", "GENERAL_FITNESS"];
const EXPERIENCES: ExperienceLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const STYLES: CoachingStyle[] = ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"];
const SPLITS: SplitType[] = ["PUSH_PULL_LEGS", "UPPER_LOWER", "FULL_BODY", "BRO_SPLIT", "CUSTOM"];
const FINAL_STEP = 7;

function labelize(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}

function scoreExercise(exercise: Exercise, query: string) {
  const q = query.toLowerCase();
  const name = exercise.name.toLowerCase();

  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(/\s+/).some((part) => part.startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  if (exercise.muscleGroup.toLowerCase() === q) return 4;
  if (exercise.movementType.toLowerCase() === q) return 5;

  return 9;
}

function rankExercises(exercises: Exercise[], query: string) {
  return [...exercises].sort((a, b) => {
    const scoreA = scoreExercise(a, query);
    const scoreB = scoreExercise(b, query);
    if (scoreA !== scoreB) return scoreA - scoreB;
    if (a.name.length !== b.name.length) return a.name.length - b.name.length;
    return a.name.localeCompare(b.name);
  });
}

export function OnboardingForm({ mode = "edit" }: { mode?: "edit" | "new" }) {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>("GENERAL_FITNESS");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("BEGINNER");
  const [coachingStyle, setCoachingStyle] = useState<CoachingStyle>("BALANCED");
  const [units, setUnits] = useState<Units>("LB");
  const [splitType, setSplitType] = useState<SplitType>("PUSH_PULL_LEGS");
  const [routineName, setRoutineName] = useState("My Routine");
  const [calibrationLength, setCalibrationLength] = useState(7);
  const [days, setDays] = useState<RoutineDay[]>([]);
  const [recommendedByDay, setRecommendedByDay] = useState<Exercise[][]>([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Exercise[]>([]);
  const [exerciseCatalog, setExerciseCatalog] = useState<Exercise[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("OTHER");
  const [customMovement, setCustomMovement] = useState("ISOLATION");
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [step, setStep] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRoutineLoaded, setCurrentRoutineLoaded] = useState(false);

  useEffect(() => {
    if (mode !== "edit") return;

    let cancelled = false;

    async function loadCurrentRoutine() {
      try {
        const data = await jsonFetch<CurrentRoutinePayload>("/api/routines/current");
        if (cancelled || !data.routine) return;

        setSplitType(data.routine.splitType);
        setRoutineName(data.routine.name);
        setDays(
          data.routine.days.map((day) => ({
            label: day.label,
            exercises: day.exercises.map((exercise) => ({
              exerciseId: exercise.exercise.id,
              name: exercise.exercise.name,
              targetSets: exercise.targetSets,
              targetRepRangeLow: exercise.targetRepRangeLow,
              targetRepRangeHigh: exercise.targetRepRangeHigh,
            })),
          })),
        );
        setActiveDayIndex(0);
        setCurrentRoutineLoaded(true);
      } catch {
        if (!cancelled) {
          setCurrentRoutineLoaded(false);
        }
      }
    }

    loadCurrentRoutine();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    async function loadTemplate() {
      const data = await jsonFetch<{ recommendedDays: RecommendedDay[] }>(
        `/api/onboarding?splitType=${splitType}&goal=${goal}`,
      );
      setRecommendedByDay(data.recommendedDays.map((day) => day.recommendedExercises ?? []));

      if (mode === "edit" && currentRoutineLoaded) {
        return;
      }

      setDays(
        data.recommendedDays.map((day) => ({
          label: day.label,
          exercises: [],
        })),
      );
      setActiveDayIndex(0);
    }

    loadTemplate().catch(() => {
      if (mode === "edit" && currentRoutineLoaded) return;
      setDays([{ label: "Day 1", exercises: [] }]);
      setRecommendedByDay([[]]);
      setActiveDayIndex(0);
    });
  }, [splitType, goal, mode, currentRoutineLoaded]);

  useEffect(() => {
    jsonFetch<{ exercises: Exercise[] }>("/api/exercises")
      .then((data) => setExerciseCatalog(data.exercises))
      .catch(() => setExerciseCatalog([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoadingSearch(false);
      return;
    }

    const needle = query.trim().toLowerCase();
    const localPool = exerciseCatalog.length ? exerciseCatalog : recommendedByDay.flat();
    const localMatches = localPool
      .filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(needle) ||
          exercise.muscleGroup.toLowerCase().includes(needle) ||
          exercise.movementType.toLowerCase().includes(needle),
      );

    const rankedLocalMatches = rankExercises(localMatches, needle).slice(0, 8);

    setResults(rankedLocalMatches);

    const id = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const data = await jsonFetch<{ exercises: Exercise[] }>(`/api/exercises?q=${encodeURIComponent(query)}`);
        const merged = [...localMatches, ...data.exercises].filter(
          (exercise, index, array) => array.findIndex((item) => item.id === exercise.id) === index,
        );
        setResults(rankExercises(merged, needle).slice(0, 8));
      } catch {
        setResults(rankedLocalMatches);
      } finally {
        setLoadingSearch(false);
      }
    }, 200);

    return () => clearTimeout(id);
  }, [query, exerciseCatalog, recommendedByDay]);

  const activeDay = days[activeDayIndex];
  const activeRecommendations = recommendedByDay[activeDayIndex] ?? [];

  const defaultRepRange = useMemo(() => {
    if (goal === "STRENGTH") return { low: 3, high: 6 };
    if (goal === "HYPERTROPHY") return { low: 8, high: 12 };
    if (goal === "ENDURANCE") return { low: 12, high: 20 };
    return { low: 6, high: 12 };
  }, [goal]);

  const stepMeta = [
    { title: "What is your training goal?", subtitle: "This sets your baseline rep ranges." },
    { title: "What is your experience level?", subtitle: "Helps tune progression pace." },
    { title: "Choose your coaching style", subtitle: "Conservative, balanced, or aggressive progression." },
    { title: "Which units do you use?", subtitle: "All weights will follow this unit." },
    { title: "Choose your split", subtitle: "Select how you want your week structured." },
    { title: "Name your routine", subtitle: "Give your plan a simple name." },
    { title: "Calibration length", subtitle: "How many workouts before strong recommendations." },
    { title: "Build your workouts", subtitle: "Add exercises to each day." },
  ] as const;

  function canContinueCurrentStep() {
    if (step === 5) return routineName.trim().length >= 2;
    return true;
  }

  function nextStep() {
    if (!canContinueCurrentStep()) return;
    setStep((prev) => Math.min(FINAL_STEP, prev + 1));
  }

  function prevStep() {
    setStep((prev) => Math.max(0, prev - 1));
  }

  function addExercise(exercise: Exercise) {
    if (!activeDay) return;

    const next = [...days];
    const exists = next[activeDayIndex].exercises.some((x) => x.exerciseId === exercise.id);
    if (exists) return;

    next[activeDayIndex].exercises.push({
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: 3,
      targetRepRangeLow: defaultRepRange.low,
      targetRepRangeHigh: defaultRepRange.high,
    });

    setDays(next);
    setQuery("");
    setResults([]);
  }

  function removeExercise(dayIndex: number, exerciseId: string) {
    const next = [...days];
    next[dayIndex].exercises = next[dayIndex].exercises.filter((item) => item.exerciseId !== exerciseId);
    setDays(next);
  }

  function updateExercise(dayIndex: number, exerciseId: string, key: keyof RoutineExercise, value: number) {
    const next = [...days];
    next[dayIndex].exercises = next[dayIndex].exercises.map((exercise) =>
      exercise.exerciseId === exerciseId ? { ...exercise, [key]: value } : exercise,
    );
    setDays(next);
  }

  async function createCustomExercise() {
    if (!customName.trim()) return;

    const data = await jsonFetch<{ exercise: Exercise }>("/api/exercises", {
      method: "POST",
      body: JSON.stringify({
        name: customName.trim(),
        muscleGroup: customMuscle,
        movementType: customMovement,
      }),
    });

    setCustomName("");
    addExercise(data.exercise);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!days.every((day) => day.exercises.length > 0)) {
      setError("Add at least one exercise to each workout day.");
      return;
    }

    setSaving(true);
    try {
      await jsonFetch("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          goal,
          experienceLevel,
          coachingStyle,
          units,
          splitType,
          routineName,
          days,
          calibrationLength,
          replaceExisting: mode !== "new",
        }),
      });
      router.push("/home");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save onboarding");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-8">
      <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">
        {mode === "new" ? "Add New Split" : "Edit Current Routine"}
      </p>
      <h1 className="text-3xl font-bold text-white">{stepMeta[step].title}</h1>
      <p className="text-sm text-zinc-200/75">{stepMeta[step].subtitle}</p>

      <div className="glass-card overflow-hidden rounded-full">
        <div
          className="h-2 bg-gradient-to-r from-red-700 to-orange-500 transition-all duration-300"
          style={{ width: `${((step + 1) / (FINAL_STEP + 1)) * 100}%` }}
        />
      </div>

      {step === 0 ? (
        <section className="glass-card space-y-2 rounded-2xl p-4">
          {GOALS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setGoal(option)}
              className={`w-full rounded-xl px-3 py-3 text-left ${goal === option ? "bg-white/20" : "bg-white/8"}`}
            >
              {labelize(option)}
            </button>
          ))}
        </section>
      ) : null}

      {step === 1 ? (
        <section className="glass-card space-y-2 rounded-2xl p-4">
          {EXPERIENCES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setExperienceLevel(option)}
              className={`w-full rounded-xl px-3 py-3 text-left ${experienceLevel === option ? "bg-white/20" : "bg-white/8"}`}
            >
              {labelize(option)}
            </button>
          ))}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="glass-card space-y-2 rounded-2xl p-4">
          {STYLES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCoachingStyle(option)}
              className={`w-full rounded-xl px-3 py-3 text-left ${coachingStyle === option ? "bg-white/20" : "bg-white/8"}`}
            >
              {labelize(option)}
            </button>
          ))}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="glass-card grid grid-cols-2 gap-2 rounded-2xl p-4">
          <button type="button" onClick={() => setUnits("LB")} className={`rounded-xl px-3 py-3 ${units === "LB" ? "bg-white/20" : "bg-white/8"}`}>
            lb
          </button>
          <button type="button" onClick={() => setUnits("KG")} className={`rounded-xl px-3 py-3 ${units === "KG" ? "bg-white/20" : "bg-white/8"}`}>
            kg
          </button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="glass-card space-y-2 rounded-2xl p-4">
          {SPLITS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSplitType(option)}
              className={`w-full rounded-xl px-3 py-3 text-left ${splitType === option ? "bg-white/20" : "bg-white/8"}`}
            >
              {labelize(option)}
            </button>
          ))}
        </section>
      ) : null}

      {step === 5 ? (
        <section className="glass-card rounded-2xl p-4">
          <label className="text-sm text-zinc-200/85">
            Routine Name
            <input value={routineName} onChange={(e) => setRoutineName(e.target.value)} className="glass-input mt-2" />
          </label>
        </section>
      ) : null}

      {step === 6 ? (
        <section className="glass-card rounded-2xl p-4">
          <label className="text-sm text-zinc-200/85">Calibration workouts: {calibrationLength}</label>
          <input
            type="range"
            min={3}
            max={20}
            value={calibrationLength}
            onChange={(e) => setCalibrationLength(Number(e.target.value))}
            className="glass-slider mt-3"
          />
        </section>
      ) : null}

      {step === FINAL_STEP ? (
        <section className="glass-card space-y-3 rounded-2xl p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day, i) => (
              <button
                key={`${day.label}-${i}`}
                type="button"
                onClick={() => setActiveDayIndex(i)}
                className={`rounded-full px-3 py-1 text-sm transition ${i === activeDayIndex ? "bg-white/20 text-white" : "bg-white/6 text-zinc-200/85"}`}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <input placeholder="Search exercises" value={query} onChange={(e) => setQuery(e.target.value)} className="glass-input" />
            {(loadingSearch || query.trim().length > 0) && (
              <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-white/15 bg-zinc-950/95 p-1 shadow-xl backdrop-blur">
                {loadingSearch ? <p className="px-3 py-2 text-xs text-zinc-300/70">Searching...</p> : null}
                {!loadingSearch && results.length === 0 ? <p className="px-3 py-2 text-xs text-zinc-300/70">No matches found.</p> : null}
                {!loadingSearch
                  ? results.slice(0, 8).map((exercise) => (
                      <button
                        key={exercise.id}
                        type="button"
                        onClick={() => addExercise(exercise)}
                        className="block w-full rounded-lg px-3 py-2 text-left transition hover:bg-white/10"
                      >
                        <p className="text-sm font-medium text-white">{exercise.name}</p>
                        <p className="text-xs text-zinc-300/70">{labelize(exercise.muscleGroup)} • {labelize(exercise.movementType)}</p>
                      </button>
                    ))
                  : null}
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl p-3">
            <p className="text-sm font-semibold">Recommended for {activeDay?.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeRecommendations.slice(0, 10).map((exercise) => {
                const isAdded = !!activeDay?.exercises.some((x) => x.exerciseId === exercise.id);

                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => addExercise(exercise)}
                    disabled={isAdded}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${isAdded ? "bg-white/10 text-zinc-400" : "bg-white/15 text-zinc-100 hover:bg-white/25"}`}
                  >
                    {exercise.name}
                  </button>
                );
              })}
              {activeRecommendations.length === 0 ? <p className="text-xs text-zinc-300/70">No day suggestions yet.</p> : null}
            </div>
          </div>

          <div className="glass-card rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Custom exercise</p>
              <button type="button" onClick={() => setShowCustomBuilder((prev) => !prev)} className="text-xs text-zinc-300/80">
                {showCustomBuilder ? "Hide" : "Add custom"}
              </button>
            </div>

            {showCustomBuilder ? (
              <div className="mt-2 space-y-2">
                <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Exercise name" className="glass-input" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={customMuscle} onChange={(e) => setCustomMuscle(e.target.value)} className="glass-input text-sm">
                    {["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "QUADS", "HAMSTRINGS", "GLUTES", "CALVES", "CORE", "FULL_BODY", "OTHER"].map((m) => (
                      <option key={m} value={m}>{labelize(m)}</option>
                    ))}
                  </select>
                  <select value={customMovement} onChange={(e) => setCustomMovement(e.target.value)} className="glass-input text-sm">
                    <option value="COMPOUND">Compound</option>
                    <option value="ISOLATION">Isolation</option>
                  </select>
                </div>
                <button type="button" onClick={createCustomExercise} className="glass-button text-sm">Create + Add</button>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">{activeDay?.label} exercises</p>
            {activeDay?.exercises.length ? (
              activeDay.exercises.map((item) => (
                <div key={item.exerciseId} className="glass-card rounded-xl p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    <button type="button" onClick={() => removeExercise(activeDayIndex, item.exerciseId)} className="text-xs text-zinc-300/80">Remove</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <label>Sets
                      <input type="number" min={1} max={8} value={item.targetSets} onChange={(e) => updateExercise(activeDayIndex, item.exerciseId, "targetSets", Number(e.target.value))} className="glass-input mt-1 px-2 py-1" />
                    </label>
                    <label>Rep Low
                      <input type="number" min={1} max={30} value={item.targetRepRangeLow} onChange={(e) => updateExercise(activeDayIndex, item.exerciseId, "targetRepRangeLow", Number(e.target.value))} className="glass-input mt-1 px-2 py-1" />
                    </label>
                    <label>Rep High
                      <input type="number" min={1} max={30} value={item.targetRepRangeHigh} onChange={(e) => updateExercise(activeDayIndex, item.exerciseId, "targetRepRangeHigh", Number(e.target.value))} className="glass-input mt-1 px-2 py-1" />
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-300/70">No exercises yet for this day.</p>
            )}
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="flex gap-2">
        {step > 0 ? (
          <button type="button" onClick={prevStep} className="glass-button-ghost">
            Back
          </button>
        ) : null}

        {step < FINAL_STEP ? (
          <button type="button" onClick={nextStep} className="glass-button" disabled={!canContinueCurrentStep()}>
            Continue
          </button>
        ) : (
          <button disabled={saving} className="glass-button disabled:opacity-50">
            {saving ? "Saving..." : mode === "new" ? "Save New Split" : "Update Routine"}
          </button>
        )}
      </div>
    </form>
  );
}
