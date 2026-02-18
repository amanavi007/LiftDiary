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

  const exercisesWithRecommendations = [];

  for (const rde of session.routineDay.exercises) {
    const history = await prisma.workoutSession.findMany({
      where: {
        userId: auth,
        sets: {
          some: {
            exerciseId: rde.exerciseId,
          },
        },
        endedAt: { not: null },
      },
      include: {
        sets: {
          where: {
            exerciseId: rde.exerciseId,
          },
        },
      },
      orderBy: { startedAt: "asc" },
      take: 12,
    });

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

    await prisma.recommendation.create({
      data: {
        userId: auth,
        exerciseId: rde.exerciseId,
        ...recommendation,
      },
    });

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
      exercises: exercisesWithRecommendations,
    },
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => ({}));

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: auth },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const updated = await prisma.workoutSession.update({
    where: { id: session.id },
    data: {
      endedAt: body.endedAt ? new Date(body.endedAt) : new Date(),
    },
  });

  const user = await prisma.user.findUnique({ where: { id: auth } });
  if (user && !updated.endedAt) {
    return NextResponse.json({ session: updated });
  }

  if (user && updated.endedAt) {
    const workoutsCompletedInCalibration = user.workoutsCompletedInCalibration + 1;
    const calibrationComplete = workoutsCompletedInCalibration >= user.calibrationLength;

    await prisma.user.update({
      where: { id: auth },
      data: {
        workoutsCompletedInCalibration,
        calibrationComplete,
      },
    });
  }

  return NextResponse.json({ session: updated });
}
