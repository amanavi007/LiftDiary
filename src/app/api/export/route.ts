import { NextResponse } from "next/server";
import { buildCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

export async function GET() {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const sets = await prisma.setEntry.findMany({
    where: { session: { userId: auth, endedAt: { not: null } } },
    include: { exercise: true, session: { include: { routineDay: true } } },
    orderBy: [{ session: { startedAt: "asc" } }, { exerciseId: "asc" }, { setIndex: "asc" }],
  });

  const csv = buildCsv(
    ["date", "started_at_utc", "workout", "exercise", "set", "weight", "reps", "units", "failed"],
    sets.map((s) => [
      s.session.startedAt.toISOString().slice(0, 10),
      s.session.startedAt.toISOString(),
      s.session.routineDay.label,
      s.exercise.name,
      s.setIndex,
      s.weight,
      s.reps,
      s.session.unitsSnapshot.toLowerCase(),
      s.isFailed,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="liftdiary-history.csv"',
      "Cache-Control": "no-store",
    },
  });
}
