import Link from "next/link";
import { PRChart } from "@/components/pr-chart";
import { ScreenShell } from "@/components/screen-shell";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { requireUser } from "@/lib/auth";
import { estimated1RM } from "@/lib/pr";
import { prisma } from "@/lib/prisma";
import { sessionBestSeries } from "@/lib/progress";

export default async function DashboardPage() {
  const user = await requireUser();
  const unit = user.units.toLowerCase();

  const sets = await prisma.setEntry.findMany({
    where: { session: { userId: user.id } },
    include: { exercise: true, session: true },
    orderBy: { timestamp: "asc" },
  });

  const grouped = new Map<string, typeof sets>();
  for (const s of sets) grouped.set(s.exerciseId, [...(grouped.get(s.exerciseId) ?? []), s]);

  const rows = [...grouped.entries()].map(([exerciseId, list]) => {
    const good = list.filter((s) => !s.isFailed);
    return {
      exerciseId,
      name: list[0].exercise.name,
      bestWeight: good.reduce((m, s) => Math.max(m, s.weight), 0),
      bestE1RM: good.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0),
      bestVolume: good.reduce((m, s) => Math.max(m, s.weight * s.reps), 0),
      sessionCount: new Set(list.map((s) => s.sessionId)).size,
      trend: sessionBestSeries(
        list.map((s) => ({
          sessionId: s.sessionId,
          date: s.session.startedAt.toISOString(),
          weight: s.weight,
          reps: s.reps,
          isFailed: s.isFailed,
        })),
      ),
    };
  });

  const byTraining = [...rows].sort((a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name));
  const top = byTraining.slice(0, 6);
  const topIds = new Set(top.map((r) => r.exerciseId));
  const others = rows.filter((r) => !topIds.has(r.exerciseId)).sort((a, b) => a.name.localeCompare(b.name));

  const details = (row: (typeof rows)[number]) => (
    <p className="text-xs text-muted-2">
      Best {row.bestWeight} {unit} · e1RM {row.bestE1RM.toFixed(1)} · volume PR {row.bestVolume.toFixed(0)}
    </p>
  );

  return (
    <ScreenShell showBack={false}>
      <div>
        <SectionLabel>Progress</SectionLabel>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95] lg:text-6xl">Your lifts</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-2">
          Estimated 1RM is a projection from your logged weight and reps. Each point is your best set of a session.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-sm text-muted-2">No progress data yet. Log sets during a workout and your charts will appear here.</p>
          <Link href="/home" className={`${buttonClass("primary")} max-w-xs`}>
            Start a workout
          </Link>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {top.map((row) => (
              <div key={row.exerciseId} className="rounded-2xl border border-line bg-surface p-3">
                <p className="truncate text-xs text-muted-2">{row.name}</p>
                <p className="tabular mt-1 font-serif text-3xl leading-none">
                  {row.bestE1RM.toFixed(0)} <span className="font-sans text-xs text-muted">{unit} e1RM</span>
                </p>
                <p className="mt-1 text-[11px] text-muted">{row.sessionCount} sessions</p>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <SectionLabel>Top lift trends</SectionLabel>
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {top.map((row) => (
                <Card key={row.exerciseId} className="space-y-2">
                  <div>
                    <p className="text-sm font-bold">{row.name}</p>
                    {details(row)}
                  </div>
                  <PRChart data={row.trend} unit={unit} />
                </Card>
              ))}
            </div>
          </section>

          {others.length > 0 ? (
            <section className="space-y-3">
              <SectionLabel>All other exercises</SectionLabel>
              <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                {others.map((row) => (
                  <details key={row.exerciseId} className="rounded-2xl border border-line bg-surface p-4">
                    <summary className="cursor-pointer list-none">
                      <p className="text-sm font-bold">{row.name}</p>
                      {details(row)}
                    </summary>
                    <div className="mt-3">
                      <PRChart data={row.trend} unit={unit} />
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}
