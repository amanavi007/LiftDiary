import { estimated1RM } from "@/lib/pr";

export type TrendPoint = { date: string; e1rm: number };

type SetLike = { sessionId: string; date: string; weight: number; reps: number; isFailed: boolean };

/** One point per session: the best estimated 1RM from that session's non-failed sets, oldest first. */
export function sessionBestSeries(sets: SetLike[]): TrendPoint[] {
  const bySession = new Map<string, TrendPoint>();
  for (const s of sets) {
    if (s.isFailed) continue;
    const e1rm = estimated1RM(s.weight, s.reps);
    const existing = bySession.get(s.sessionId);
    if (!existing || e1rm > existing.e1rm) bySession.set(s.sessionId, { date: s.date, e1rm });
  }
  return [...bySession.values()]
    .map((p) => ({ date: p.date, e1rm: Number(p.e1rm.toFixed(1)) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
