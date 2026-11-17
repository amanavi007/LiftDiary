const DAY_MS = 86_400_000;

type ReadinessSet = { weight: number; reps: number; isFailed: boolean };
export type ReadinessSession = {
  startedAt: Date;
  endedAt: Date | null;
  routineDayId: string;
  sets: ReadinessSet[];
};

export type Readiness = {
  score: number | null;
  label: "Getting started" | "Good to push" | "Steady" | "Take it easy";
  note: string;
};

function volume(session: ReadinessSession) {
  return session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * A simple, explainable 0-100 readiness hint. It never blocks a workout.
 * Starting weights (tune against real data): recency, failed sets, volume spike.
 */
export function computeReadiness(args: {
  now: Date;
  targetDayId: string;
  sessions: ReadinessSession[];
}): Readiness {
  const completed = args.sessions
    .filter((s) => s.endedAt !== null && s.sets.length > 0)
    .sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime());

  if (completed.length === 0) {
    return {
      score: null,
      label: "Getting started",
      note: "Log a few workouts and I'll start estimating how ready you are.",
    };
  }

  const last = completed.find((s) => s.routineDayId === args.targetDayId) ?? completed[0];
  const daysSince = (args.now.getTime() - last.endedAt!.getTime()) / DAY_MS;

  let recencyPenalty = 0;
  if (daysSince < 1) recencyPenalty = 25;
  else if (daysSince < 2) recencyPenalty = 10;

  const failedRatio = last.sets.length ? last.sets.filter((s) => s.isFailed).length / last.sets.length : 0;
  const failedPenalty = Math.round(40 * failedRatio);

  const weekAgo = args.now.getTime() - 7 * DAY_MS;
  const monthAgo = args.now.getTime() - 28 * DAY_MS;
  const recentVolume = completed
    .filter((s) => s.endedAt!.getTime() > weekAgo)
    .reduce((sum, s) => sum + volume(s), 0);
  const priorVolume = completed
    .filter((s) => s.endedAt!.getTime() <= weekAgo && s.endedAt!.getTime() > monthAgo)
    .reduce((sum, s) => sum + volume(s), 0);
  const priorWeeklyAvg = priorVolume / 3;
  const spikePenalty = priorWeeklyAvg > 0 && recentVolume > priorWeeklyAvg * 1.3 ? 15 : 0;

  const score = Math.max(0, Math.min(100, Math.round(100 - recencyPenalty - failedPenalty - spikePenalty)));

  const label: Readiness["label"] = score >= 70 ? "Good to push" : score >= 45 ? "Steady" : "Take it easy";

  const worst = Math.max(recencyPenalty, failedPenalty, spikePenalty);
  let note = "You're rested and your last session went well.";
  if (worst > 0) {
    if (worst === recencyPenalty) note = "You trained very recently, so a lighter day is fine.";
    else if (worst === failedPenalty) note = "Several sets failed last time, so don't chase extra weight today.";
    else note = "This week's volume jumped, so keep today controlled.";
  }

  return { score, label, note };
}
