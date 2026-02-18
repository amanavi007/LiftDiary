import { SetEntry } from "@prisma/client";

export function estimated1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

export function roundWeight(weight: number, units: "LB" | "KG") {
  const step = units === "LB" ? 2.5 : 1.25;
  return Math.max(step, Math.round(weight / step) * step);
}

export function summarizeExercisePRs(sets: SetEntry[]) {
  if (!sets.length) {
    return {
      bestWeight: 0,
      bestRepsAtBestWeight: 0,
      bestEstimated1RM: 0,
      maxVolumeSet: 0,
    };
  }

  let bestWeight = 0;
  let bestRepsAtBestWeight = 0;
  let bestEstimated1RM = 0;
  let maxVolumeSet = 0;

  for (const set of sets) {
    const setVolume = set.weight * set.reps;
    const e1rm = estimated1RM(set.weight, set.reps);

    if (set.weight > bestWeight || (set.weight === bestWeight && set.reps > bestRepsAtBestWeight)) {
      bestWeight = set.weight;
      bestRepsAtBestWeight = set.reps;
    }

    if (e1rm > bestEstimated1RM) {
      bestEstimated1RM = e1rm;
    }

    if (setVolume > maxVolumeSet) {
      maxVolumeSet = setVolume;
    }
  }

  return {
    bestWeight,
    bestRepsAtBestWeight,
    bestEstimated1RM,
    maxVolumeSet,
  };
}
