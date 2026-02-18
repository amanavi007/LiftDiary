import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

const schema = z.object({
  routineDayId: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth } });
  if (!user || !user.goal) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }

  const routineDay = await prisma.routineDay.findFirst({
    where: {
      id: parsed.data.routineDayId,
      routine: {
        userId: auth,
      },
    },
  });

  if (!routineDay) {
    return NextResponse.json({ error: "Workout day not found" }, { status: 404 });
  }

  const session = await prisma.workoutSession.create({
    data: {
      userId: auth,
      routineDayId: routineDay.id,
      coachingStyleSnapshot: user.coachingStyle,
      goalSnapshot: user.goal,
      unitsSnapshot: user.units,
    },
  });

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
}
