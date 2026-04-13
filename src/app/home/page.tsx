import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeTodayPlanClient } from "@/components/home-today-plan-client";
import { ScreenShell } from "@/components/screen-shell";
import { isOnboardingComplete, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const user = await requireUser();
  if (!isOnboardingComplete(user)) redirect("/onboarding");

  const routine = user.routines[0];

  // Last session determines which day is "next"
  const lastSession = await prisma.workoutSession.findFirst({
    where: { userId: user.id, endedAt: { not: null } },
    include: { routineDay: true },
    orderBy: { startedAt: "desc" },
  });

  const nextDayIndex = lastSession
    ? (lastSession.routineDay.dayIndex + 1) % (routine?.days.length ?? 1)
    : 0;
  const nextDayId = routine?.days[nextDayIndex]?.id ?? routine?.days[0]?.id ?? "";
  const nextDay = routine?.days[nextDayIndex]?.label ?? routine?.days[0]?.label ?? "Workout";

  // Consecutive-day streak
  const completedSessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, endedAt: { not: null } },
    select: { startedAt: true },
    orderBy: { startedAt: "desc" },
  });

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const distinctDays = [...new Set(completedSessions.map((s) => dayKey(s.startedAt)))];
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));

  let streak = 0;
  if (distinctDays.length > 0 && (distinctDays[0] === today || distinctDays[0] === yesterday)) {
    const cursor = new Date(distinctDays[0] === today ? Date.now() : Date.now() - 86_400_000);
    for (const day of distinctDays) {
      if (dayKey(cursor) === day) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // In-progress session for resume banner
  const activeSession = await prisma.workoutSession.findFirst({
    where: { userId: user.id, endedAt: null },
    include: { routineDay: true },
    orderBy: { startedAt: "desc" },
  });

  const calibrationProgress = Math.min(user.workoutsCompletedInCalibration, user.calibrationLength);
  const calibrationPct = (calibrationProgress / user.calibrationLength) * 100;

  return (
    <ScreenShell>
      {/* Compact header */}
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-orange-200/60">LiftDiary</p>
          <h1 className="mt-0.5 text-2xl font-black text-white">
            {completedSessions.length === 0
              ? "Let's go"
              : streak >= 3
              ? `${streak}-day streak 🔥`
              : nextDay}
          </h1>
          {completedSessions.length > 0 && (
            <p className="mt-0.5 text-xs text-zinc-500">
              {completedSessions.length} session{completedSessions.length === 1 ? "" : "s"} logged
            </p>
          )}
        </div>
        {streak > 0 && streak < 3 && (
          <div className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1.5">
            <span className="text-sm">🔥</span>
            <span className="text-sm font-bold text-orange-300">{streak}</span>
          </div>
        )}
      </header>

      {/* Resume in-progress session */}
      {activeSession ? (
        <Link
          href={`/workout/session/${activeSession.id}`}
          className="mb-3 flex items-center justify-between rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-300">
              Resume Workout
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white">
              {activeSession.routineDay.label} in progress
            </p>
          </div>
          <span className="text-orange-300">→</span>
        </Link>
      ) : null}

      {/* Hero: today's workout */}
      <HomeTodayPlanClient
        defaultDayId={nextDayId}
        dayPlans={(routine?.days ?? []).map((day) => ({
          id: day.id,
          label: day.label,
          exercises: day.exercises.map((e) => ({
            name: e.exercise.name,
            targetSets: e.targetSets,
            targetRepRangeLow: e.targetRepRangeLow,
            targetRepRangeHigh: e.targetRepRangeHigh,
          })),
        }))}
      />

      {/* Calibration progress — slim, only while active */}
      {!user.calibrationComplete ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">AI calibrating</span>
            <span className="font-medium text-white">
              {calibrationProgress}/{user.calibrationLength} sessions
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
              style={{ width: `${calibrationPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {user.calibrationLength - calibrationProgress} more session
            {user.calibrationLength - calibrationProgress === 1 ? "" : "s"} to unlock personalised weights
          </p>
        </div>
      ) : null}
    </ScreenShell>
  );
}
