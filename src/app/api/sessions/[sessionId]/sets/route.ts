import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

const schema = z.object({
  exerciseId: z.string().min(1),
  setIndex: z.number().int().min(1).max(20),
  weight: z.number().min(0),
  reps: z.number().int().min(0).max(50),
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

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: auth },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

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

  return NextResponse.json({ set }, { status: 201 });
}
