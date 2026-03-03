import Link from "next/link";
import { ScreenShell } from "@/components/screen-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionSet = {
  id: string;
  exerciseId: string;
  setIndex: number;
  reps: number;
  weight: number;
  isFailed: boolean;
  exercise: {
    name: string;
  };
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function sessionDurationMinutes(startedAt: Date, endedAt: Date | null) {
  if (!endedAt) return null;
  return Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function groupSetsByExercise(sets: SessionSet[]) {
  const map = new Map<string, { name: string; sets: SessionSet[] }>();

  for (const set of sets) {
    const current = map.get(set.exerciseId) ?? { name: set.exercise.name, sets: [] };
    current.sets.push(set);
    map.set(set.exerciseId, current);
  }

  return Array.from(map.values());
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const day = params.day;

  const routine = user.routines[0];

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId: user.id,
      ...(day ? { routineDayId: day } : {}),
      endedAt: { not: null },
    },
    include: {
      routineDay: true,
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setIndex: "asc" }],
      },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const totalSessions = sessions.length;
  const totalSets = sessions.reduce((sum, session) => sum + session.sets.length, 0);
  const totalVolume = sessions.reduce(
    (sum, session) => sum + session.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0),
    0,
  );

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sessionsThisWeek = sessions.filter((session) => session.startedAt >= sevenDaysAgo).length;

  return (
    <ScreenShell>
      <h1 className="mb-2 text-3xl font-bold text-white">Workout History</h1>
      <p className="mb-3 text-sm text-zinc-200/75">Quick overview first, then open any session to view exercise and set details.</p>

      {sessions.length > 0 ? (
        <section className="mb-3 grid grid-cols-2 gap-2 text-xs">
          <div className="glass-card rounded-xl px-3 py-2.5">
            <p className="text-zinc-300/70">Sessions</p>
            <p className="text-base font-semibold text-zinc-100">{totalSessions}</p>
          </div>
          <div className="glass-card rounded-xl px-3 py-2.5">
            <p className="text-zinc-300/70">Last 7 Days</p>
            <p className="text-base font-semibold text-zinc-100">{sessionsThisWeek}</p>
          </div>
          <div className="glass-card rounded-xl px-3 py-2.5">
            <p className="text-zinc-300/70">Total Sets</p>
            <p className="text-base font-semibold text-zinc-100">{totalSets}</p>
          </div>
          <div className="glass-card rounded-xl px-3 py-2.5">
            <p className="text-zinc-300/70">Volume</p>
            <p className="text-base font-semibold text-zinc-100">{formatCompactNumber(Math.round(totalVolume))}</p>
          </div>
        </section>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Link href="/history" className={`glass-pill px-3 py-1 ${!day ? "bg-white/20 text-white" : "text-zinc-200/85"}`}>
          All
        </Link>
        {routine?.days.map((d) => (
          <Link key={d.id} href={`/history?day=${d.id}`} className={`glass-pill px-3 py-1 ${day === d.id ? "bg-white/20 text-white" : "text-zinc-200/85"}`}>
            {d.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3 pb-24">
        {sessions.length === 0 ? (
          <div className="glass-card rounded-2xl p-4 text-sm text-zinc-200/80">
            <p>No sessions yet. Start your first workout to build your history.</p>
            <div className="mt-2 flex gap-2 text-xs">
              <Link href="/workout/start" className="glass-pill px-3 py-1 text-zinc-100">
                Start Workout
              </Link>
              <Link href="/home" className="glass-pill px-3 py-1 text-zinc-200/90">
                Back to Home
              </Link>
            </div>
          </div>
        ) : null}
        {sessions.map((session) => {
          const grouped = groupSetsByExercise(session.sets);
          const duration = sessionDurationMinutes(session.startedAt, session.endedAt);
          const volume = session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
          const failedSets = session.sets.filter((set) => set.isFailed).length;
          const topExercises = grouped.slice(0, 3).map((exercise) => exercise.name);

          return (
            <article key={session.id} className="glass-card rounded-2xl p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">{session.routineDay.label}</p>
                  <p className="text-xs text-zinc-300/80">{formatDate(session.startedAt)}</p>
                </div>
                <span className="glass-pill px-2 py-1 text-[11px] text-zinc-100">{grouped.length} exercises</span>
              </div>

              <div className="mb-2 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs text-zinc-200/85">
                <p>
                  {session.sets.length} sets • {formatCompactNumber(Math.round(volume))} volume • {duration ? `${duration} min` : "No duration"}
                  {failedSets > 0 ? ` • ${failedSets} failed` : ""}
                </p>
              </div>

              <p className="mb-2 text-xs text-zinc-300/80">
                {topExercises.join(" • ")}
                {grouped.length > 3 ? ` • +${grouped.length - 3} more` : ""}
              </p>

              <details className="rounded-xl border border-white/12 bg-white/6 p-3">
                <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">View details</summary>

                <div className="mt-3 space-y-2">
                  {grouped.map((exercise) => (
                    <div key={`${session.id}-${exercise.name}`} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                        <span className="text-[11px] text-zinc-300/80">{exercise.sets.length} sets</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-200/85">
                        {exercise.sets.map((set) => (
                          <span key={set.id} className="rounded-md border border-white/12 bg-white/6 px-2 py-0.5">
                            {set.setIndex}: {set.weight} {session.unitsSnapshot} × {set.reps}
                            {set.isFailed ? " • F" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>

            </article>
          );
        })}
      </div>
    </ScreenShell>
  );
}
