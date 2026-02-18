import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const routineDayId = searchParams.get("routineDayId");

  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId: auth,
      ...(routineDayId ? { routineDayId } : {}),
    },
    include: {
      routineDay: true,
      sets: {
        include: {
          exercise: true,
        },
        orderBy: [{ exerciseId: "asc" }, { setIndex: "asc" }],
      },
    },
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ sessions });
}
