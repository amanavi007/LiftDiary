import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

export async function GET(request: Request) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const routineDayId = searchParams.get("routineDayId");

  // Verify the routine day belongs to this user before filtering by it
  if (routineDayId) {
    const routineDay = await prisma.routineDay.findFirst({
      where: { id: routineDayId, routine: { userId: auth } },
    });
    if (!routineDay) {
      return NextResponse.json({ error: "Routine day not found" }, { status: 404 });
    }
  }

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
