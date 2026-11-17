import type { ReadinessSession } from "@/lib/readiness";

/** Suggest a lighter week when readiness is low and failed sets keep showing up. Never blocks a workout. */
export function shouldSuggestDeload(sessions: ReadinessSession[], currentScore: number | null): boolean {
  if (currentScore === null || currentScore >= 45) return false;
  const recent = sessions
    .filter((s) => s.endedAt !== null && s.sets.length > 0)
    .sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())
    .slice(0, 3);
  const grindy = recent.filter((s) => s.sets.filter((x) => x.isFailed).length / s.sets.length >= 0.25);
  return grindy.length >= 2;
}
