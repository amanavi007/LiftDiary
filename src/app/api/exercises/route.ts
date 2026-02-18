import { MuscleGroup, MovementType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

type SearchExercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  movementType: MovementType;
};

function scoreExercise(exercise: SearchExercise, query: string) {
  const q = query.toLowerCase();
  const name = exercise.name.toLowerCase();

  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(/\s+/).some((part) => part.startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  if (exercise.muscleGroup.toLowerCase() === q) return 4;
  if (exercise.movementType.toLowerCase() === q) return 5;

  return 9;
}

const createSchema = z.object({
  name: z.string().min(2).max(80),
  muscleGroup: z.enum(MuscleGroup),
  movementType: z.enum(MovementType),
  equipment: z.string().max(60).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const upper = q?.toUpperCase();
  const isMuscleGroup = upper ? (Object.values(MuscleGroup) as string[]).includes(upper) : false;
  const isMovementType = upper ? (Object.values(MovementType) as string[]).includes(upper) : false;

  const where = q
    ? {
        OR: [
          {
            name: {
              contains: q,
            },
          },
          ...(isMuscleGroup
            ? [
                {
                  muscleGroup: {
                    equals: upper as MuscleGroup,
                  },
                },
              ]
            : []),
          ...(isMovementType
            ? [
                {
                  movementType: {
                    equals: upper as MovementType,
                  },
                },
              ]
            : []),
        ],
      }
    : {};

  const fetched = await prisma.exercise.findMany({
    where,
    orderBy: { name: "asc" },
    take: q ? 600 : 120,
  });

  const exercises = q
    ? fetched
        .sort((a, b) => {
          const scoreA = scoreExercise(a, q);
          const scoreB = scoreExercise(b, q);
          if (scoreA !== scoreB) return scoreA - scoreB;
          if (a.name.length !== b.name.length) return a.name.length - b.name.length;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 120)
    : fetched;

  return NextResponse.json({ exercises });
}

export async function POST(request: Request) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const exercise = await prisma.exercise.create({
    data: {
      ...parsed.data,
      isCustom: true,
      createdByUserId: auth,
    },
  });

  return NextResponse.json({ exercise }, { status: 201 });
}
