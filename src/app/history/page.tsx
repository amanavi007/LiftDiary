import Link from "next/link";
import { ScreenShell } from "@/components/screen-shell";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { SectionLabel } from "@/components/ui/section-label";
import { StatTile } from "@/components/ui/stat-tile";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(value);
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const user = await requireUser();
  const { day } = await searchParams;
  const routine = user.routines[0];

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId: user.id,
      ...(day ? { routineDayId: day } : {}),
      endedAt: { not: null },
      sets: { some: {} }, // sessions finished with nothing logged are noise
    },
    include: {
      routineDay: true,
      sets: { include: { exercise: true }, orderBy: [{ exerciseId: "asc" }, { setIndex: "asc" }] },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const totalSets = sessions.reduce((sum, s) => sum + s.sets.length, 0);
  const totalVolume = sessions.reduce((sum, s) => sum + s.sets.reduce((v, x) => v + x.weight * x.reps, 0), 0);
  const weekAgo = new Date(new Date().getTime() - 7 * 86_400_000);
  const lastWeek = sessions.filter((s) => s.startedAt >= weekAgo).length;

  const chip = (active: boolean) =>
    `inline-flex min-h-9 items-center rounded-full px-4 text-xs font-bold transition ${
      active ? "bg-accent text-bg" : "bg-line text-muted-2 hover:text-ink"
    }`;

  return (
    <ScreenShell showBack={false}>
      <div>
        <SectionLabel>History</SectionLabel>
        <h1 className="mt-1 font-serif text-5xl leading-[0.95] lg:text-6xl">Your sessions</h1>
      </div>

      {sessions.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          <StatTile value={String(sessions.length)} label="Sessions" />
          <StatTile value={String(lastWeek)} label="Last 7d" tone={lastWeek ? "accent" : "default"} />
          <StatTile value={compact(totalSets)} label="Sets" />
          <StatTile value={compact(Math.round(totalVolume))} label="Volume" />
        </div>
      ) : null}

      <div className="flex gap-1.5 overflow-x-auto">
        <Link href="/history" className={chip(!day)}>
          All
        </Link>
        {routine?.days.map((d) => (
          <Link key={d.id} href={`/history?day=${d.id}`} className={chip(day === d.id)}>
            {d.label}
          </Link>
        ))}
      </div>

      {sessions.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-sm text-muted-2">No sessions yet. Start your first workout to build your history.</p>
          <Link href="/home" className={`${buttonClass("primary")} max-w-xs`}>
            Go to Home
          </Link>
        </Card>
      ) : (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {sessions.map((session) => {
            const groups = new Map<string, { name: string; sets: typeof session.sets }>();
            for (const set of session.sets) {
              const g = groups.get(set.exerciseId) ?? { name: set.exercise.name, sets: [] };
              g.sets.push(set);
              groups.set(set.exerciseId, g);
            }
            const exercises = [...groups.values()];
            const volume = session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
            const failed = session.sets.filter((s) => s.isFailed).length;
            const minutes = session.endedAt
              ? Math.max(1, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000))
              : null;
            const unit = session.unitsSnapshot.toLowerCase();

            return (
              <Card key={session.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-3xl leading-none">{session.routineDay.label}</p>
                    <p className="mt-1 text-xs text-muted-2">{formatDate(session.startedAt)}</p>
                  </div>
                  <Pill>
                    {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
                  </Pill>
                </div>
                <p className="tabular text-xs text-muted-2">
                  {session.sets.length} set{session.sets.length === 1 ? "" : "s"} · {compact(Math.round(volume))} {unit} volume · {minutes ? `${minutes} min` : "no duration"}
                  {failed > 0 ? ` · ${failed} failed` : ""}
                </p>
                <details className="group rounded-xl bg-bg p-3">
                  <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-sm font-bold">
                    <span className="truncate text-muted-2 group-open:text-ink">
                      {exercises.slice(0, 3).map((e) => e.name).join(" · ")}
                      {exercises.length > 3 ? ` · +${exercises.length - 3}` : ""}
                    </span>
                    <span aria-hidden className="ml-2 text-muted">▾</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {exercises.map((ex) => (
                      <div key={`${session.id}-${ex.name}`}>
                        <p className="text-sm font-bold">{ex.name}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {ex.sets.map((set) => (
                            <span
                              key={set.id}
                              className={`tabular rounded-lg bg-surface px-2 py-1 text-[11px] ${set.isFailed ? "text-warn" : "text-muted-2"}`}
                            >
                              {set.weight} × {set.reps}
                              {set.isFailed ? " · failed" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
}
