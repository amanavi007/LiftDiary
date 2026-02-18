import Link from "next/link";
import { notFound } from "next/navigation";
import { ScreenShell } from "@/components/screen-shell";
import { estimated1RM } from "@/lib/pr";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export default async function WorkoutSummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const user = await requireUser();
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({
    where: {
      id: sessionId,
      userId: user.id,
    },
    include: {
      sets: {
        include: { exercise: true },
      },
    },
  });

  if (!session) notFound();

  const totalVolume = session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
  const bestSet = session.sets.reduce(
    (best, set) => {
      if (set.weight > best.weight) return { weight: set.weight, reps: set.reps, exerciseName: set.exercise.name };
      return best;
    },
    { weight: 0, reps: 0, exerciseName: "N/A" },
  );

  const grouped = new Map<string, { exerciseName: string; bestWeight: number; bestReps: number }>();
  for (const set of session.sets) {
    const row = grouped.get(set.exerciseId) ?? { exerciseName: set.exercise.name, bestWeight: 0, bestReps: 0 };
    if (set.weight > row.bestWeight || (set.weight === row.bestWeight && set.reps > row.bestReps)) {
      row.bestWeight = set.weight;
      row.bestReps = set.reps;
    }
    grouped.set(set.exerciseId, row);
  }

  return (
    <ScreenShell>
      <header className="glass-card-strong rounded-2xl p-4">
        <h1 className="text-3xl font-bold text-white">Workout Complete</h1>
        <p className="text-sm text-zinc-200/80">Total volume: {totalVolume.toFixed(0)} {session.unitsSnapshot}</p>
        <p className="text-sm text-zinc-200/80">
          Best set: {bestSet.exerciseName} {bestSet.weight} × {bestSet.reps}
        </p>
      </header>

      <section className="glass-card mt-3 space-y-2 rounded-2xl p-4">
        <h2 className="font-semibold">Next time recommendations</h2>
        {Array.from(grouped.values()).map((entry) => (
          <div key={entry.exerciseName} className="glass-card rounded-xl p-3">
            <p className="font-medium">{entry.exerciseName}</p>
            <p className="text-xs text-zinc-200/75">
              Keep around {entry.bestWeight} {session.unitsSnapshot} for {Math.max(3, entry.bestReps - 1)}-{entry.bestReps + 1} reps.
            </p>
            <p className="text-xs text-zinc-200/60">Best estimated 1RM this session: {estimated1RM(entry.bestWeight, entry.bestReps).toFixed(1)}</p>
          </div>
        ))}
      </section>

      <div className="mt-4 space-y-2">
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
