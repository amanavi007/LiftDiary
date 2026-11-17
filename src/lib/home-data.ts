import { buildRecommendation } from "@/lib/recommendation";
import { prisma } from "@/lib/prisma";
import { computeReadiness, type Readiness } from "@/lib/readiness";
import { liftTrend, type LiftTrend } from "@/lib/trend";
import type { getCurrentUser } from "@/lib/auth";

type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type HomeLift = {
  name: string;
  targetSets: number;
  repLow: number;
  repHigh: number;
  lastWeight: number | null;
  lastReps: number | null;
  todayWeight: number;
  trend: LiftTrend;
};

export type HomeDay = { id: string; label: string; lifts: HomeLift[]; readiness: Readiness };

export type HomeData = {
  units: "LB" | "KG";
  days: HomeDay[];
  defaultDayId: string;
  completedCount: number;
  completedDates: string[];
  activeSession: { id: string; label: string } | null;
  calibration: { complete: boolean; done: number; length: number };
};

export async function loadHomeData(user: User): Promise<HomeData> {
  const routine = user.routines[0];
  const routineDays = routine?.days ?? [];
  const now = new Date();

  const [sessions, completedCount, active] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id, endedAt: { not: null } },
      include: { sets: true },
      orderBy: { startedAt: "desc" },
      take: 150,
    }),
    prisma.workoutSession.count({ where: { userId: user.id, endedAt: { not: null } } }),
    prisma.workoutSession.findFirst({
      where: { userId: user.id, endedAt: null },
      include: { routineDay: true },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  const chronological = [...sessions].reverse();

  const last = sessions[0];
  const lastDay = last ? routineDays.find((d) => d.id === last.routineDayId) : undefined;
  const nextIndex = lastDay ? (lastDay.dayIndex + 1) % routineDays.length : 0;
  const defaultDayId = routineDays[nextIndex]?.id ?? routineDays[0]?.id ?? "";

  const readinessSessions = sessions.map((s) => ({
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    routineDayId: s.routineDayId,
    sets: s.sets.map((x) => ({ weight: x.weight, reps: x.reps, isFailed: x.isFailed })),
  }));

  const days: HomeDay[] = routineDays.map((day) => ({
    id: day.id,
    label: day.label,
    readiness: computeReadiness({ now, targetDayId: day.id, sessions: readinessSessions }),
    lifts: day.exercises.map((rde) => {
      const history = chronological
        .filter((s) => s.sets.some((x) => x.exerciseId === rde.exerciseId))
        .slice(-12)
        .map((s) => ({ ...s, sets: s.sets.filter((x) => x.exerciseId === rde.exerciseId) }));

      const lastSets = history.at(-1)?.sets.filter((x) => !x.isFailed) ?? [];
      const lastWeight = lastSets.length ? Math.max(...lastSets.map((x) => x.weight)) : null;
      const lastReps = lastWeight === null ? null : Math.max(...lastSets.filter((x) => x.weight === lastWeight).map((x) => x.reps));

      const rec = buildRecommendation({
        sessions: history,
        calibrationComplete: user.calibrationComplete,
        calibrationLength: user.calibrationLength,
        workoutsCompleted: user.workoutsCompletedInCalibration,
        goal: user.goal ?? "GENERAL_FITNESS",
        coachingStyle: user.coachingStyle,
        movementType: rde.exercise.movementType,
        units: user.units,
        defaultSets: rde.targetSets,
      });

      return {
        name: rde.exercise.name,
        targetSets: rde.targetSets,
        repLow: rde.targetRepRangeLow,
        repHigh: rde.targetRepRangeHigh,
        lastWeight,
        lastReps,
        todayWeight: rec.recommendedWeight,
        trend: liftTrend(rec.recommendedWeight, lastWeight),
      };
    }),
  }));

  return {
    units: user.units,
    days,
    defaultDayId,
    completedCount,
    completedDates: sessions.map((s) => s.startedAt.toISOString()),
    activeSession: active ? { id: active.id, label: active.routineDay.label } : null,
    calibration: {
      complete: user.calibrationComplete,
      done: Math.min(user.workoutsCompletedInCalibration, user.calibrationLength),
      length: user.calibrationLength,
    },
  };
}
