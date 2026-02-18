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

  const exerciseRows = Array.from(byExercise.values()).sort((a, b) => a.name.localeCompare(b.name));
  const majorLiftNames = ["Barbell Bench Press", "Back Squat", "Deadlift", "Overhead Press", "Barbell Row"];
  const majorRows = exerciseRows.filter((row) => majorLiftNames.includes(row.name));
  const otherRows = exerciseRows.filter((row) => !majorLiftNames.includes(row.name));

  return (
    <ScreenShell>
      <h1 className="mb-3 text-3xl font-bold text-white">PR Dashboard</h1>

      <section className="glass-card mb-3 rounded-2xl p-4">
        <h2 className="mb-2 text-sm font-semibold text-zinc-200/85">Major Lift Estimated 1RM</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {majorLiftNames.map((lift) => {
            const found = exerciseRows.find((row) => row.name === lift);
            return (
              <div key={lift} className="glass-card rounded-xl p-2">
                <p className="text-xs text-zinc-200/70">{lift}</p>
                <p className="font-semibold">{found ? found.bestE1RM.toFixed(1) : "—"}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        {exerciseRows.length === 0 ? <p className="text-sm text-zinc-200/70">Log sessions to unlock PR insights.</p> : null}

        {majorRows.length > 0 ? (
          <article className="glass-card rounded-2xl p-4">
            <p className="mb-2 text-sm font-semibold text-zinc-100">Major Lift Trends</p>
            <div className="space-y-2">
              {majorRows.map((row) => (
                <details key={row.name} className="rounded-xl border border-white/12 bg-white/6 p-3" open>
                  <summary className="cursor-pointer list-none">
                    <p className="font-semibold text-white">{row.name}</p>
                    <p className="text-xs text-zinc-200/70">Best weight: {row.bestWeight} • Best e1RM: {row.bestE1RM.toFixed(1)} • Volume PR: {row.bestVolume.toFixed(0)}</p>
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
                    <p className="text-xs text-zinc-200/70">Best weight: {row.bestWeight} • Best e1RM: {row.bestE1RM.toFixed(1)} • Volume PR: {row.bestVolume.toFixed(0)}</p>
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
