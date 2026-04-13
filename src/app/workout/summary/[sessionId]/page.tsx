import Link from "next/link";
import { notFound } from "next/navigation";
import { ScreenShell } from "@/components/screen-shell";
import { estimated1RM } from "@/lib/pr";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: "High confidence", color: "text-emerald-400" };
  if (score >= 0.6) return { label: "Building confidence", color: "text-amber-400" };
  return { label: "Calibrating", color: "text-zinc-400" };
}

function trendArrow(currentE1RM: number, prevE1RM: number | null): { symbol: string; color: string } {
  if (prevE1RM === null) return { symbol: "→", color: "text-zinc-400" };
  const delta = currentE1RM - prevE1RM;
  if (delta > 1) return { symbol: "↑", color: "text-emerald-400" };
  if (delta < -1) return { symbol: "↓", color: "text-red-400" };
  return { symbol: "→", color: "text-zinc-400" };
}

function sessionDurationMinutes(startedAt: Date, endedAt: Date | null) {
  if (!endedAt) return null;
  return Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
}

export default async function WorkoutSummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: {
      routineDay: {
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setIndex: "asc" }],
      },
    },
  });

  if (!session) notFound();

  const exerciseIds = session.routineDay.exercises.map((rde) => rde.exerciseId);

  // Pull ML recommendations persisted when this session was first loaded.
  const recommendations = await prisma.recommendation.findMany({
    where: {
      userId: user.id,
      exerciseId: { in: exerciseIds },
      generatedAt: { gte: session.startedAt },
    },
    orderBy: { generatedAt: "desc" },
  });

  // De-duplicate: one recommendation per exercise (most recent wins).
  const recByExercise = new Map<string, typeof recommendations[number]>();
  for (const rec of recommendations) {
    if (!recByExercise.has(rec.exerciseId)) {
      recByExercise.set(rec.exerciseId, rec);
    }
  }

  // All previous completed sessions for this user with relevant exercise history,
  // used for PR detection and e1RM trend comparison.
  const previousSessions = await prisma.workoutSession.findMany({
    where: {
      userId: user.id,
      id: { not: sessionId },
      endedAt: { not: null },
      sets: { some: { exerciseId: { in: exerciseIds } } },
    },
    include: {
      sets: {
        where: { exerciseId: { in: exerciseIds }, isFailed: false },
        select: { exerciseId: true, weight: true, reps: true },
      },
    },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  // Per-exercise: session best and all-time historical best for PR detection.
  type ExerciseSummary = {
    name: string;
    sessionBestWeight: number;
    sessionBestReps: number;
    sessionBestE1RM: number;
    prevBestWeight: number;
    prevBestE1RM: number;
    prevSessionE1RM: number | null;
    isWeightPR: boolean;
    isE1RMPR: boolean;
    rec: typeof recommendations[number] | undefined;
  };

  const exerciseSummaries: ExerciseSummary[] = [];

  for (const rde of session.routineDay.exercises) {
    const exerciseId = rde.exerciseId;
    const sessionSets = session.sets.filter((s) => s.exerciseId === exerciseId && !s.isFailed);
    if (!sessionSets.length) continue;

    const sessionBestWeight = sessionSets.reduce((m, s) => Math.max(m, s.weight), 0);
    const sessionBestReps = sessionSets
      .filter((s) => s.weight === sessionBestWeight)
      .reduce((m, s) => Math.max(m, s.reps), 0);
    const sessionBestE1RM = sessionSets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0);

    const histSets = previousSessions.flatMap((ps) => ps.sets.filter((s) => s.exerciseId === exerciseId));
    const prevBestWeight = histSets.reduce((m, s) => Math.max(m, s.weight), 0);
    const prevBestE1RM = histSets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0);

    // e1RM from the most recent prior session for trend arrow.
    const mostRecentPriorSession = previousSessions.find((ps) =>
      ps.sets.some((s) => s.exerciseId === exerciseId),
    );
    const prevSessionSets = mostRecentPriorSession?.sets.filter((s) => s.exerciseId === exerciseId) ?? [];
    const prevSessionE1RM =
      prevSessionSets.length > 0
        ? prevSessionSets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0)
        : null;

    exerciseSummaries.push({
      name: rde.exercise.name,
      sessionBestWeight,
      sessionBestReps,
      sessionBestE1RM,
      prevBestWeight,
      prevBestE1RM,
      prevSessionE1RM,
      isWeightPR: histSets.length > 0 && sessionBestWeight > prevBestWeight,
      isE1RMPR: histSets.length > 0 && sessionBestE1RM > prevBestE1RM,
      rec: recByExercise.get(exerciseId),
    });
  }

  const totalVolume = session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
  const duration = sessionDurationMinutes(session.startedAt, session.endedAt);
  const prCount = exerciseSummaries.filter((e) => e.isWeightPR || e.isE1RMPR).length;

  return (
    <ScreenShell>
      {/* Header */}
      <header className="glass-card-strong rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-orange-200/70">
          {session.routineDay.label} Complete
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">Workout Done</h1>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-white/8 px-2.5 py-2 text-center">
            <p className="text-zinc-300/70">Volume</p>
            <p className="font-semibold text-white">{Math.round(totalVolume).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white/8 px-2.5 py-2 text-center">
            <p className="text-zinc-300/70">Duration</p>
            <p className="font-semibold text-white">{duration ? `${duration}m` : "—"}</p>
          </div>
          <div className="rounded-xl bg-white/8 px-2.5 py-2 text-center">
            <p className="text-zinc-300/70">PRs Hit</p>
            <p className={`font-semibold ${prCount > 0 ? "text-orange-300" : "text-white"}`}>
              {prCount > 0 ? `🏆 ${prCount}` : "—"}
            </p>
          </div>
        </div>
      </header>

      {/* Next session recommendations — driven by ML */}
      <section className="mt-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300/70">Next Session Plan</p>

        {exerciseSummaries.map((entry) => {
          const rec = entry.rec;
          const { symbol, color } = trendArrow(entry.sessionBestE1RM, entry.prevSessionE1RM);
          const conf = rec ? confidenceLabel(rec.confidenceScore) : null;
          const isPR = entry.isWeightPR || entry.isE1RMPR;

          return (
            <div
              key={entry.name}
              className={`glass-card rounded-2xl p-4 ${isPR ? "border border-orange-500/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white">{entry.name}</p>
                  {isPR ? (
                    <p className="mt-0.5 text-xs font-medium text-orange-300">
                      {entry.isWeightPR ? "Weight PR" : ""}
                      {entry.isWeightPR && entry.isE1RMPR ? " · " : ""}
                      {entry.isE1RMPR ? "Est. 1RM PR" : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className={`font-bold ${color}`}>{symbol}</span>
                  <span className="text-xs text-zinc-300/70">
                    e1RM {entry.sessionBestE1RM.toFixed(0)} {session.unitsSnapshot}
                  </span>
                </div>
              </div>

              {rec ? (
                <div className="mt-3 rounded-xl bg-white/6 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-300/60">Next time</p>
                      <p className="mt-0.5 text-xl font-bold text-white">
                        {rec.recommendedWeight} {session.unitsSnapshot}
                      </p>
                      <p className="text-xs text-zinc-300/75">
                        {rec.recommendedSets} sets × {rec.recommendedRepLow}–{rec.recommendedRepHigh} reps
                      </p>
                    </div>
                    {conf ? (
                      <span className={`text-[11px] font-medium ${conf.color}`}>{conf.label}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-zinc-300/65">{rec.reasonText}</p>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-white/6 px-3 py-2.5">
                  <p className="text-xs text-zinc-300/70">
                    Keep working around {entry.sessionBestWeight} {session.unitsSnapshot}. More data will improve recommendations.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="mt-4 space-y-2 pb-24">
        <Link href="/home" className="glass-button block text-center">
          Back Home
        </Link>
        <Link href="/history" className="glass-button-ghost block text-center">
          View History
        </Link>
      </div>
    </ScreenShell>
  );
}
