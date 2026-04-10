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

  const calibrationProgress = `${Math.min(user.workoutsCompletedInCalibration, user.calibrationLength)}/${user.calibrationLength}`;

  return (
    <ScreenShell>
      <header className="mb-3">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">LiftDiary</p>
        <h1 className="text-3xl font-bold text-white">{streak === 0 ? "Welcome" : streak < 5 ? "Keep it going" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-zinc-200/75">{streak === 0 ? "Pick a workout day below and log your first session." : `${streak} session${streak === 1 ? "" : "s"} logged. ${nextDay} is up next.`}</p>
      </header>

      {streak === 0 ? (
        <section className="glass-card mb-4 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-200/70">Quick start</p>
          <ol className="mt-2 space-y-2 text-sm text-zinc-100/90">
            <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">1</span><span>Pick your workout day in <strong>Today Plan</strong> below.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">2</span><span>Log your weight and reps for each set.</span></li>
            <li className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white">3</span><span>Check <strong>Progress</strong> after {user.calibrationLength} sessions for personalised recommendations.</span></li>
          </ol>
        </section>
      ) : null}

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
          <p className="text-xs text-zinc-300/70">This Week</p>
          <p className="text-lg font-semibold text-white">{sessionsThisWeek}</p>
        </div>
        {!user.calibrationComplete && (
          <div className="glass-card col-span-2 rounded-xl px-3 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs text-zinc-300/70">Calibration progress</p>
              <p className="text-xs font-semibold text-white">{calibrationProgress} workouts</p>
            </div>
            <div className="overflow-hidden rounded-full bg-white/10">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
                style={{ width: `${(user.workoutsCompletedInCalibration / user.calibrationLength) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400/80">Complete {user.calibrationLength - user.workoutsCompletedInCalibration} more session{user.calibrationLength - user.workoutsCompletedInCalibration === 1 ? "" : "s"} to unlock personalised recommendations.</p>
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl p-3">
        <p className="text-xs uppercase tracking-[0.14em] text-zinc-300/70">Recent Activity</p>
        {lastSession ? (
          <div className="mt-1.5 space-y-0.5">
            <p className="text-sm font-semibold text-white">{lastSession.routineDay.label}</p>
            <p className="text-xs text-zinc-300/75">
              {formatDate(lastSession.startedAt)} • {lastSession._count.sets} sets logged
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-zinc-300/75">No sessions logged yet. Tap Start Workout to begin and this section will show your latest result.</p>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/8 px-2.5 py-1.5">
            <p className="text-xs text-zinc-300/70">Next Up</p>
            <p className="text-sm font-semibold text-white">{nextDay}</p>
          </div>
          <div className="rounded-xl bg-white/8 px-2.5 py-1.5">
            <p className="text-xs text-zinc-300/70">Status</p>
            <p className="text-sm font-semibold text-white">Ready</p>
          </div>
        </div>
      </section>
    </ScreenShell>
  );
}
