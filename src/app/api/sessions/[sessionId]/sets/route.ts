import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";
import { estimated1RM } from "@/lib/pr";

const schema = z.object({
  exerciseId: z.string().min(1),
  setIndex: z.number().int().min(1).max(20),
  weight: z.number().min(0).max(1000),
  reps: z.number().int().min(1).max(50),
  isFailed: z.boolean().default(false),
});

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Verify session exists and the exercise belongs to its routine day
  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: auth },
    include: {
      routineDay: {
        include: {
          exercises: { where: { exerciseId: parsed.data.exerciseId } },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.routineDay.exercises.length === 0) {
    return NextResponse.json({ error: "Exercise not in this routine" }, { status: 400 });
  }

  // Fetch historical bests for this exercise (excluding the current session)
  // so we can tell the client immediately whether this is a PR.
  const historicalSets = await prisma.setEntry.findMany({
    where: {
      exerciseId: parsed.data.exerciseId,
      session: { userId: auth, id: { not: sessionId } },
      isFailed: false,
    },
    select: { weight: true, reps: true },
  });

  const prevBestWeight = historicalSets.reduce((m, s) => Math.max(m, s.weight), 0);
  const prevBestE1RM = historicalSets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0);

  const set = await prisma.setEntry.create({
    data: {
      sessionId,
      exerciseId: parsed.data.exerciseId,
      setIndex: parsed.data.setIndex,
      weight: parsed.data.weight,
      reps: parsed.data.reps,
      isFailed: parsed.data.isFailed,
    },
  });

  // Only declare a PR on non-failed sets with actual weight logged.
  const pr =
    !parsed.data.isFailed && parsed.data.weight > 0 && historicalSets.length > 0
      ? {
          isWeightPR: parsed.data.weight > prevBestWeight,
          isE1RMPR: estimated1RM(parsed.data.weight, parsed.data.reps) > prevBestE1RM,
          prevBestWeight,
          prevBestE1RM: Number(prevBestE1RM.toFixed(1)),
          newE1RM: Number(estimated1RM(parsed.data.weight, parsed.data.reps).toFixed(1)),
        }
      : null;

  return NextResponse.json({ set, pr }, { status: 201 });
}
