import { NextResponse } from "next/server";
import { buildRecommendation } from "@/lib/recommendation";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

export async function GET(_: Request, context: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const { sessionId } = await context.params;

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: auth },
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
        orderBy: { setIndex: "asc" },
      },
      user: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const exerciseIds = session.routineDay.exercises.map((rde) => rde.exerciseId);

  // Single query for all exercise history instead of one per exercise (fixes N+1)
  const allHistory = await prisma.workoutSession.findMany({
    where: {
      userId: auth,
      sets: { some: { exerciseId: { in: exerciseIds } } },
      endedAt: { not: null },
    },
    include: {
      sets: {
        where: { exerciseId: { in: exerciseIds } },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  const exercisesWithRecommendations = [];

  for (const rde of session.routineDay.exercises) {
    const history = allHistory
      .filter((s) => s.sets.some((set) => set.exerciseId === rde.exerciseId))
      .slice(-12)
      .map((s) => ({
        ...s,
        sets: s.sets.filter((set) => set.exerciseId === rde.exerciseId),
      }));

    const recommendation = buildRecommendation({
      sessions: history,
      calibrationComplete: session.user.calibrationComplete,
      calibrationLength: session.user.calibrationLength,
      workoutsCompleted: session.user.workoutsCompletedInCalibration,
      goal: session.user.goal ?? session.goalSnapshot,
      coachingStyle: session.user.coachingStyle,
      movementType: rde.exercise.movementType,
      units: session.user.units,
      defaultSets: rde.targetSets,
    });

    // Only persist if no recommendation has been generated for this exercise
    // since the session started — prevents duplicate rows on repeated fetches.
    const existingRec = await prisma.recommendation.findFirst({
      where: {
        userId: auth,
        exerciseId: rde.exerciseId,
        generatedAt: { gte: session.startedAt },
      },
    });

    if (!existingRec) {
      await prisma.recommendation.create({
        data: {
          userId: auth,
          exerciseId: rde.exerciseId,
          ...recommendation,
        },
      });
    }

    exercisesWithRecommendations.push({
      routineDayExerciseId: rde.id,
      exercise: rde.exercise,
      targetSets: rde.targetSets,
      targetRepRangeLow: rde.targetRepRangeLow,
      targetRepRangeHigh: rde.targetRepRangeHigh,
      recommendation,
      loggedSets: session.sets.filter((set) => set.exerciseId === rde.exerciseId),
    });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      routineDay: {
        id: session.routineDay.id,
        label: session.routineDay.label,
      },
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      coachingStyle: session.coachingStyleSnapshot,
      goal: session.goalSnapshot,
      units: session.unitsSnapshot,
      preferredRestSeconds: session.user.preferredRestSeconds,
      exercises: exercisesWithRecommendations,
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => ({}));

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.workoutSession.findFirst({
      where: { id: sessionId, userId: auth },
    });

    if (!session) return null;

    // Already completed — return as-is to prevent double-counting
    if (session.endedAt) return { session, alreadyEnded: true };

    const updated = await tx.workoutSession.update({
      where: { id: session.id },
      data: { endedAt: body.endedAt ? new Date(body.endedAt) : new Date() },
    });

    const user = await tx.user.findUnique({ where: { id: auth } });
    if (user) {
      const workoutsCompletedInCalibration = user.workoutsCompletedInCalibration + 1;
      await tx.user.update({
        where: { id: auth },
        data: {
          workoutsCompletedInCalibration,
          calibrationComplete: workoutsCompletedInCalibration >= user.calibrationLength,
        },
      });
    }

    return { session: updated, alreadyEnded: false };
  });

  if (!result) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session: result.session });
}
