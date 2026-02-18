import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

export async function GET() {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const routine = await prisma.routine.findFirst({
    where: { userId: auth },
    include: {
      days: {
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { dayIndex: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ routine });
}
