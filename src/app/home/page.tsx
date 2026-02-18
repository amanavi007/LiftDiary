import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeTodayPlanClient } from "@/components/home-today-plan-client";
import { ScreenShell } from "@/components/screen-shell";
import { isOnboardingComplete, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(value);
}

export default async function HomePage() {
  const user = await requireUser();
  if (!isOnboardingComplete(user)) redirect("/onboarding");

  const routine = user.routines[0];
  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId: user.id, endedAt: { not: null } },
    include: {
      routineDay: true,
      _count: {
        select: {
          sets: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const nextDay = (() => {
    if (!routine?.days?.length) return "Build your routine";
    if (!lastSession) return routine.days[0].label;
    const nextIndex = (lastSession.routineDay.dayIndex + 1) % routine.days.length;
    return routine.days[nextIndex]?.label ?? routine.days[0].label;
  })();

  const nextDayId = (() => {
    if (!routine?.days?.length) return "";
    if (!lastSession) return routine.days[0].id;
    const nextIndex = (lastSession.routineDay.dayIndex + 1) % routine.days.length;
    return routine.days[nextIndex]?.id ?? routine.days[0].id;
  })();

  const streak = await prisma.workoutSession.count({
    where: {
      userId: user.id,
      endedAt: { not: null },
    },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const sessionsThisWeek = await prisma.workoutSession.count({
    where: {
      userId: user.id,
      endedAt: { gte: sevenDaysAgo },
    },
  });

  const routineDays = routine?.days?.length ?? 0;
  const calibrationProgress = `${Math.min(user.workoutsCompletedInCalibration, user.calibrationLength)}/${user.calibrationLength}`;

  return (
    <ScreenShell>
      <header className="mb-3">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">LiftDiary</p>
        <h1 className="text-3xl font-bold text-white">Train hard today</h1>
      </header>

      <HomeTodayPlanClient
        defaultDayId={nextDayId}
        dayPlans={(routine?.days ?? []).map((day) => ({
          id: day.id,
          label: day.label,
          exercises: day.exercises.map((exercise) => ({
            name: exercise.exercise.name,
            targetSets: exercise.targetSets,
            targetRepRangeLow: exercise.targetRepRangeLow,
            targetRepRangeHigh: exercise.targetRepRangeHigh,
          })),
        }))}
      />

      <section className="mb-4 grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl px-3 py-3">
          <p className="text-xs text-zinc-300/70">Total Sessions</p>
          <p className="text-lg font-semibold text-white">{streak}</p>
        </div>
        <div className="glass-card rounded-xl px-3 py-3">
          <p className="text-xs text-zinc-300/70">Last 7 Days</p>
          <p className="text-lg font-semibold text-white">{sessionsThisWeek}</p>
        </div>
        <div className="glass-card rounded-xl px-3 py-3">
          <p className="text-xs text-zinc-300/70">Routine Days</p>
          <p className="text-lg font-semibold text-white">{routineDays || "—"}</p>
        </div>
        {!user.calibrationComplete && (
          <div className="glass-card rounded-xl px-3 py-3">
            <p className="text-xs text-zinc-300/70">Calibration</p>
            <p className="text-lg font-semibold text-white">{calibrationProgress}</p>
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl p-4 pb-24">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-300/70">Recent Activity</p>
        {lastSession ? (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-semibold text-white">{lastSession.routineDay.label}</p>
            <p className="text-xs text-zinc-300/75">
              {formatDate(lastSession.startedAt)} • {lastSession._count.sets} sets logged
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-300/75">No sessions logged yet. Start your first workout now.</p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/8 px-3 py-2">
            <p className="text-xs text-zinc-300/70">Next Up</p>
            <p className="text-sm font-semibold text-white">{nextDay}</p>
          </div>
          <div className="rounded-xl bg-white/8 px-3 py-2">
            <p className="text-xs text-zinc-300/70">Status</p>
            <p className="text-sm font-semibold text-white">Ready</p>
          </div>
        </div>
      </section>
    </ScreenShell>
  );
}
