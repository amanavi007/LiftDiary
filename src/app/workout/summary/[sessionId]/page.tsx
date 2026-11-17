import Link from "next/link";
import { notFound } from "next/navigation";
import { ScreenShell } from "@/components/screen-shell";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { StatTile } from "@/components/ui/stat-tile";
import { requireUser } from "@/lib/auth";
import { estimated1RM } from "@/lib/pr";
import { prisma } from "@/lib/prisma";
import { sessionBestSeries } from "@/lib/progress";
import { liftTrend } from "@/lib/trend";

function confidenceLabel(score: number) {
  if (score >= 0.8) return "High confidence";
  if (score >= 0.6) return "Building confidence";
  return "Calibrating";
}

export default async function WorkoutSummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: {
      routineDay: { include: { exercises: { include: { exercise: true }, orderBy: { orderIndex: "asc" } } } },
      sets: { include: { exercise: true }, orderBy: [{ exerciseId: "asc" }, { setIndex: "asc" }] },
    },
  });
  if (!session) notFound();

  // Every exercise actually trained: routine order first, then anything swapped in.
  const routineOrder = session.routineDay.exercises.map((r) => r.exerciseId);
  const trainedIds = [...new Set(session.sets.map((s) => s.exerciseId))].sort((a, b) => {
    const ia = routineOrder.indexOf(a);
    const ib = routineOrder.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  const [recommendations, previousSessions] = await Promise.all([
    prisma.recommendation.findMany({
      where: { userId: user.id, exerciseId: { in: trainedIds }, generatedAt: { gte: session.startedAt } },
      orderBy: { generatedAt: "desc" },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        id: { not: sessionId },
        endedAt: { not: null },
        sets: { some: { exerciseId: { in: trainedIds } } },
      },
      include: {
        sets: {
          where: { exerciseId: { in: trainedIds }, isFailed: false },
          select: { exerciseId: true, weight: true, reps: true },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);

  const recByExercise = new Map<string, (typeof recommendations)[number]>();
  for (const rec of recommendations) if (!recByExercise.has(rec.exerciseId)) recByExercise.set(rec.exerciseId, rec);

  const units = session.unitsSnapshot.toLowerCase();

  const lifts = trainedIds.flatMap((exerciseId) => {
    const sets = session.sets.filter((s) => s.exerciseId === exerciseId && !s.isFailed);
    if (!sets.length) return [];
    const name = session.sets.find((s) => s.exerciseId === exerciseId)!.exercise.name;
    const topWeight = Math.max(...sets.map((s) => s.weight));
    const topReps = Math.max(...sets.filter((s) => s.weight === topWeight).map((s) => s.reps));
    const e1rm = Math.max(...sets.map((s) => estimated1RM(s.weight, s.reps)));

    const history = previousSessions.flatMap((p) => p.sets.filter((s) => s.exerciseId === exerciseId));
    const prevBestWeight = history.reduce((m, s) => Math.max(m, s.weight), 0);
    const prevBestE1RM = history.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0);

    const lastSets = previousSessions.find((p) => p.sets.some((s) => s.exerciseId === exerciseId))?.sets.filter(
      (s) => s.exerciseId === exerciseId,
    );
    const lastTop = lastSets?.length ? Math.max(...lastSets.map((s) => s.weight)) : null;

    const series = sessionBestSeries(
      previousSessions.flatMap((p) =>
        p.sets
          .filter((x) => x.exerciseId === exerciseId)
          .map((x) => ({ sessionId: p.id, date: p.startedAt.toISOString(), weight: x.weight, reps: x.reps, isFailed: false })),
      ),
    )
      .map((pt) => pt.e1rm)
      .slice(-5);

    return [
      {
        name,
        trendBars: [...series, Number(e1rm.toFixed(1))],
        topWeight,
        topReps,
        e1rm,
        trend: liftTrend(topWeight, lastTop),
        isWeightPR: history.length > 0 && topWeight > prevBestWeight,
        isE1RMPR: history.length > 0 && e1rm > prevBestE1RM,
        prevBestWeight,
        rec: recByExercise.get(exerciseId),
      },
    ];
  });

  const totalVolume = session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  const minutes = session.endedAt
    ? Math.max(1, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000))
    : null;
  const prs = lifts.filter((l) => l.isWeightPR || l.isE1RMPR);
  const volumeLabel = totalVolume >= 10000 ? `${(totalVolume / 1000).toFixed(1)}k` : Math.round(totalVolume).toLocaleString();

  return (
    <ScreenShell showBack={false}>
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-8 lg:space-y-0">
        <div className="space-y-4">
          <div>
            <SectionLabel>{session.routineDay.label} complete</SectionLabel>
            <h1 className="mt-1 font-serif text-5xl leading-[0.95] lg:text-7xl">Nice work.</h1>
          </div>

          <div className="flex gap-2">
            <StatTile value={minutes ? `${minutes}m` : "—"} label="Time" />
            <StatTile value={volumeLabel} label={`Volume ${units}`} />
            <StatTile value={String(prs.length)} label="PRs" tone={prs.length ? "accent" : "default"} />
          </div>

          {prs.map((pr) => (
            <Card key={pr.name} tone="accent">
              <SectionLabel>🏆 New PR</SectionLabel>
              <p className="mt-1 text-base font-bold">
                {pr.name} {pr.topWeight} {units} × {pr.topReps}
              </p>
              <p className="mt-0.5 text-xs text-muted-2">
                {[
                  pr.isWeightPR ? `+${Math.round((pr.topWeight - pr.prevBestWeight) * 100) / 100} ${units} over your old best` : "",
                  pr.isE1RMPR ? `est. 1RM ${pr.e1rm.toFixed(0)} ${units}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {pr.trendBars.length > 1 ? (
                <div className="mt-3 flex h-9 items-end gap-1" aria-label="Estimated 1RM over recent sessions" role="img">
                  {pr.trendBars.map((v, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${i === pr.trendBars.length - 1 ? "bg-accent" : "bg-accent/25"}`}
                      style={{ height: `${Math.max(12, (v / Math.max(...pr.trendBars)) * 100)}%` }}
                    />
                  ))}
                </div>
              ) : null}
            </Card>
          ))}

          <div className="hidden space-y-2 lg:block">
            <Link href="/home" className={buttonClass("primary", "lg")}>
              Done
            </Link>
            <Link href="/history" className={buttonClass("ghost")}>
              View history
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <SectionLabel>Lifts and next time</SectionLabel>
          {lifts.length === 0 ? (
            <Card>
              <p className="text-sm text-muted-2">No sets were logged in this workout.</p>
            </Card>
          ) : (
            lifts.map((lift) => (
              <Card key={lift.name} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{lift.name}</p>
                    <p className="text-[11px] text-muted">
                      Best set {lift.topWeight} × {lift.topReps} · e1RM {lift.e1rm.toFixed(0)}
                    </p>
                  </div>
                  <p
                    className={`tabular shrink-0 text-sm font-bold ${
                      lift.trend === "up" ? "text-accent" : lift.trend === "down" ? "text-warn" : "text-muted-2"
                    }`}
                  >
                    {lift.trend === "up" ? "↑" : lift.trend === "down" ? "↓" : lift.trend === "hold" ? "=" : "new"}{" "}
                    {lift.trend === "new" ? "" : `${lift.topWeight}`}
                  </p>
                </div>
                {lift.rec ? (
                  <div className="rounded-xl bg-bg px-3 py-2.5">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <SectionLabel>Next time</SectionLabel>
                        <p className="tabular font-serif text-3xl leading-none">
                          {lift.rec.recommendedWeight} <span className="text-base text-muted-2">{units}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-2">
                          {lift.rec.recommendedSets} × {lift.rec.recommendedRepLow}–{lift.rec.recommendedRepHigh}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-muted">{confidenceLabel(lift.rec.confidenceScore)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted">{lift.rec.reasonText}</p>
                  </div>
                ) : null}
              </Card>
            ))
          )}
          <div className="space-y-2 pt-2 lg:hidden">
            <Link href="/home" className={buttonClass("primary", "lg")}>
              Done
            </Link>
            <Link href="/history" className={buttonClass("ghost")}>
              View history
            </Link>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}
