import Link from "next/link";
import { ScreenShell } from "@/components/screen-shell";
import { PRChart } from "@/components/pr-chart";
import { estimated1RM } from "@/lib/pr";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();

  const sets = await prisma.setEntry.findMany({
    where: {
      session: {
        userId: user.id,
      },
    },
    include: {
      exercise: true,
      session: true,
    },
    orderBy: { timestamp: "asc" },
  });

  const byExercise = new Map<string, { name: string; bestWeight: number; bestE1RM: number; bestVolume: number; trend: { date: string; e1rm: number }[] }>();

  for (const set of sets) {
    const row = byExercise.get(set.exerciseId) ?? {
      name: set.exercise.name,
      bestWeight: 0,
      bestE1RM: 0,
      bestVolume: 0,
      trend: [],
    };

    row.bestWeight = Math.max(row.bestWeight, set.weight);
    row.bestE1RM = Math.max(row.bestE1RM, estimated1RM(set.weight, set.reps));
    row.bestVolume = Math.max(row.bestVolume, set.weight * set.reps);
    row.trend.push({ date: set.session.startedAt.toISOString().slice(0, 10), e1rm: Number(estimated1RM(set.weight, set.reps).toFixed(1)) });

    byExercise.set(set.exerciseId, row);
  }

  // Count distinct sessions each exercise appears in, so we can surface the
  // user's most-trained lifts rather than hardcoding exercise names.
  const sessionCountByExercise = new Map<string, Set<string>>();
  for (const set of sets) {
    const sessions = sessionCountByExercise.get(set.exerciseId) ?? new Set<string>();
    sessions.add(set.sessionId);
    sessionCountByExercise.set(set.exerciseId, sessions);
  }

  const exerciseRows = Array.from(byExercise.entries())
    .map(([exerciseId, row]) => ({
      ...row,
      exerciseId,
      sessionCount: sessionCountByExercise.get(exerciseId)?.size ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Top lifts = the 6 exercises the user has trained in the most sessions.
  const topLiftIds = new Set(
    [...exerciseRows]
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 6)
      .map((r) => r.exerciseId),
  );

  const majorRows = exerciseRows.filter((row) => topLiftIds.has(row.exerciseId));
  const otherRows = exerciseRows.filter((row) => !topLiftIds.has(row.exerciseId));

  return (
    <ScreenShell>
      <h1 className="mb-2 text-3xl font-bold text-white">Progress Dashboard</h1>
      <p className="mb-3 text-sm text-zinc-200/75">
        Track your strongest sets over time. Estimated 1RM is a projection based on your logged weight and reps.
      </p>

      {majorRows.length > 0 ? (
        <section className="glass-card mb-3 rounded-2xl p-4">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200/85">Your Top Lifts</h2>
          <p className="mb-2 text-xs text-zinc-300/75">Your most-trained exercises ranked by sessions logged.</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {majorRows.map((row) => (
              <div key={row.exerciseId} className="glass-card rounded-xl p-2">
                <p className="truncate text-xs text-zinc-200/70">{row.name}</p>
                <p className="font-semibold text-white">
                  {row.bestE1RM.toFixed(1)} {user.units.toLowerCase()}
                </p>
                <p className="text-[10px] text-zinc-400/70">{row.sessionCount} sessions</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3 pb-24">
        {exerciseRows.length === 0 ? (
          <div className="glass-card rounded-2xl p-4 text-sm text-zinc-200/80">
            <p>No progress data yet. Log sets during a workout and your charts will appear here.</p>
            <Link href="/home" className="glass-pill mt-3 inline-block px-3 py-1 text-xs text-zinc-100">
              Start a Workout →
            </Link>
          </div>
        ) : null}

        {majorRows.length > 0 ? (
          <article className="glass-card rounded-2xl p-4">
            <p className="mb-2 text-sm font-semibold text-zinc-100">Top Lift Trends</p>
            <div className="space-y-2">
              {majorRows.map((row) => (
                <details key={row.name} className="rounded-xl border border-white/12 bg-white/6 p-3" open>
                  <summary className="cursor-pointer list-none">
                    <p className="font-semibold text-white">{row.name}</p>
                    <p className="text-xs text-zinc-200/70">Best weight: {row.bestWeight} {user.units.toLowerCase()} • e1RM: {row.bestE1RM.toFixed(1)} {user.units.toLowerCase()} • Volume PR: {row.bestVolume.toFixed(0)}</p>
                  </summary>
                  <div className="mt-2">
                    <PRChart data={row.trend} />
                  </div>
                </details>
              ))}
            </div>
          </article>
        ) : null}

        {otherRows.length > 0 ? (
          <article className="glass-card rounded-2xl p-4">
            <p className="mb-2 text-sm font-semibold text-zinc-100">All Exercise Trends</p>
            <div className="space-y-2">
              {otherRows.map((row) => (
                <details key={row.name} className="rounded-xl border border-white/12 bg-white/6 p-3">
                  <summary className="cursor-pointer list-none">
                    <p className="font-semibold text-white">{row.name}</p>
                    <p className="text-xs text-zinc-200/70">Best weight: {row.bestWeight} {user.units.toLowerCase()} • e1RM: {row.bestE1RM.toFixed(1)} {user.units.toLowerCase()} • Volume PR: {row.bestVolume.toFixed(0)}</p>
                  </summary>
                  <div className="mt-2">
                    <PRChart data={row.trend} />
                  </div>
                </details>
              ))}
            </div>
          </article>
        ) : null}
      </section>
    </ScreenShell>
  );
}
