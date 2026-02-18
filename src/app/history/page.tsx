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

  return (
    <ScreenShell>
      <h1 className="mb-3 text-3xl font-bold text-white">Workout History</h1>

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
        {sessions.length === 0 ? <p className="text-sm text-zinc-200/70">No sessions yet.</p> : null}
        {sessions.map((session) => {
          const grouped = groupSetsByExercise(session.sets);
          const duration = sessionDurationMinutes(session.startedAt, session.endedAt);
          const volume = session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
          const failedSets = session.sets.filter((set) => set.isFailed).length;

          return (
            <article key={session.id} className="glass-card rounded-2xl p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">{session.routineDay.label}</p>
                  <p className="text-xs text-zinc-200/70">{formatDate(session.startedAt)}</p>
                </div>
                <span className="glass-pill px-2 py-1 text-[11px] text-zinc-100">{grouped.length} exercises</span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-lg border border-white/12 bg-white/6 px-2 py-1.5">
                  <p className="text-zinc-300/70">Sets</p>
                  <p className="font-semibold text-zinc-100">{session.sets.length}</p>
                </div>
                <div className="rounded-lg border border-white/12 bg-white/6 px-2 py-1.5">
                  <p className="text-zinc-300/70">Volume</p>
                  <p className="font-semibold text-zinc-100">{Math.round(volume)}</p>
                </div>
                <div className="rounded-lg border border-white/12 bg-white/6 px-2 py-1.5">
                  <p className="text-zinc-300/70">Duration</p>
                  <p className="font-semibold text-zinc-100">{duration ? `${duration}m` : "—"}</p>
                </div>
              </div>

              <div className="space-y-2">
                {grouped.map((exercise) => (
                  <details key={`${session.id}-${exercise.name}`} className="rounded-xl border border-white/12 bg-white/6 p-2" open>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-100">{exercise.name}</p>
                      <span className="text-[11px] text-zinc-300/80">{exercise.sets.length} sets</span>
                    </summary>

                    <div className="mt-2 space-y-1 text-xs text-zinc-200/85">
                      {exercise.sets.map((set) => (
                        <div key={set.id} className="flex items-center justify-between rounded-lg border border-white/8 bg-black/20 px-2 py-1">
                          <span>Set {set.setIndex}</span>
                          <span>
                            {set.weight} {session.unitsSnapshot} × {set.reps}
                            {set.isFailed ? " • Failed" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>

              {failedSets > 0 ? (
                <p className="mt-2 text-xs text-orange-200/80">{failedSets} failed set{failedSets === 1 ? "" : "s"} in this session</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </ScreenShell>
  );
}
