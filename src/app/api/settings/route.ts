import { CoachingStyle, Goal, Units } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

const schema = z.object({
  units: z.enum(Units).optional(),
  coachingStyle: z.enum(CoachingStyle).optional(),
  goal: z.enum(Goal).optional(),
  preferredRestSeconds: z.number().int().min(30).max(300).optional(),
  calibrationLength: z.number().int().min(3).max(20).optional(),
});

export async function GET() {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth },
    select: {
      units: true,
      coachingStyle: true,
      goal: true,
      preferredRestSeconds: true,
      calibrationLength: true,
    },
  });

  return NextResponse.json({ settings: user });
}

export async function PATCH(request: Request) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: auth },
    data: parsed.data,
    select: {
      units: true,
      coachingStyle: true,
      goal: true,
      preferredRestSeconds: true,
      calibrationLength: true,
    },
  });

  return NextResponse.json({ settings: updated });
}
