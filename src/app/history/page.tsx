import Link from "next/link";
import { ScreenShell } from "@/components/screen-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

      <div className="space-y-3">
        {sessions.length === 0 ? <p className="text-sm text-zinc-200/70">No sessions yet.</p> : null}
        {sessions.map((session) => (
          <article key={session.id} className="glass-card rounded-2xl p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <p className="font-semibold">{session.routineDay.label}</p>
              <p className="text-zinc-200/70">{new Date(session.startedAt).toLocaleDateString()}</p>
            </div>

            <div className="space-y-1 text-xs text-zinc-300">
              {session.sets.map((set) => (
                <p key={set.id}>
                  {set.exercise.name} — Set {set.setIndex}: {set.weight} {session.unitsSnapshot} × {set.reps}
                  {set.isFailed ? " (Failed)" : ""}
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </ScreenShell>
  );
}
