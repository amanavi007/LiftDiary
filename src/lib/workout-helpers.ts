export type Units = "LB" | "KG";

export type LoggedSet = {
  setIndex: number;
  weight: number;
  reps: number;
  isFailed: boolean;
};

export type SessionExercise = {
  exercise: { id: string; name: string; defaultRestSec: number };
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

export type SessionPayload = {
  session: {
    id: string;
    routineDay: { label: string };
    exercises: SessionExercise[];
    units: Units;
    preferredRestSeconds: number | null;
  };
};

export type SetInput = { weight: number | ""; reps: number | ""; isFailed: boolean };

export function roundToUnit(weight: number, units: Units) {
  const step = units === "KG" ? 1.25 : 2.5;
  if (weight <= 0) return 0;
  return Math.round(weight / step) * step;
}

export const PLATE_SIZES: Record<Units, number[]> = {
  LB: [45, 35, 25, 10, 5, 2.5],
  KG: [20, 15, 10, 5, 2.5, 1.25],
};

export function barWeightFor(units: Units) {
  return units === "LB" ? 45 : 20;
}

/** Plates needed per side for a total barbell weight, largest first. */
export function calcPlates(totalWeight: number, units: Units): number[] {
  let perSide = (totalWeight - barWeightFor(units)) / 2;
  if (perSide <= 0) return [];
  const plates: number[] = [];
  for (const plate of PLATE_SIZES[units]) {
    while (perSide >= plate - 0.001) {
      plates.push(plate);
      perSide = Math.round((perSide - plate) * 1000) / 1000;
    }
  }
  return plates;
}

type SuggestionInput = {
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  recommendation: { recommendedWeight: number; recommendedRepHigh: number };
  loggedSets: LoggedSet[];
};

export function getNextSetSuggestion(exercise: SuggestionInput, units: Units) {
  const lastSet = exercise.loggedSets.at(-1);
  let weight = exercise.recommendation.recommendedWeight || lastSet?.weight || 0;
  if (lastSet) {
    if (lastSet.isFailed || lastSet.reps < exercise.targetRepRangeLow) weight = lastSet.weight * 0.975;
    else if (lastSet.reps > exercise.targetRepRangeHigh) weight = lastSet.weight * 1.025;
    else weight = lastSet.weight;
  }
  return {
    weight: roundToUnit(weight, units),
    reps: exercise.recommendation.recommendedRepHigh || exercise.targetRepRangeHigh,
  };
}

export function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function tutorialQuery(exerciseName: string) {
  return `${exerciseName} form tutorial short`;
}

export function tutorialSearchUrl(exerciseName: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(tutorialQuery(exerciseName))}`;
}

export function swapCandidates<T extends { id: string; name: string }>(catalog: T[], takenIds: string[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return catalog.filter((e) => !takenIds.includes(e.id) && e.name.toLowerCase().includes(q)).slice(0, 8);
}
