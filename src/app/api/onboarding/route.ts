import {
  CoachingStyle,
  ExperienceLevel,
  Goal,
  SplitType,
  Units,
} from "@prisma/client";
import { MuscleGroup } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GOAL_REP_RANGES, SPLIT_TEMPLATES } from "@/lib/defaults";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

const dayExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1).max(8),
  targetRepRangeLow: z.number().int().min(1).max(30),
  targetRepRangeHigh: z.number().int().min(1).max(30),
});

const routineDaySchema = z.object({
  label: z.string().min(1).max(40),
  exercises: z.array(dayExerciseSchema),
});

const schema = z.object({
  goal: z.enum(Goal),
  experienceLevel: z.enum(ExperienceLevel),
  coachingStyle: z.enum(CoachingStyle),
  units: z.enum(Units),
  splitType: z.enum(SplitType),
  routineName: z.string().min(2).max(50),
  days: z.array(routineDaySchema).min(1),
  calibrationLength: z.number().int().min(3).max(20).default(7),
});

function inferMuscleGroups(dayLabel: string): MuscleGroup[] {
  const label = dayLabel.toLowerCase();

  if (label.includes("push") || label.includes("chest")) {
    return ["CHEST", "SHOULDERS", "TRICEPS"];
  }
  if (label.includes("pull") || label.includes("back")) {
    return ["BACK", "BICEPS", "SHOULDERS"];
  }
  if (label.includes("legs") || label.includes("lower") || label.includes("quad")) {
    return ["QUADS", "HAMSTRINGS", "GLUTES", "CALVES"];
  }
  if (label.includes("upper")) {
    return ["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"];
  }
  if (label.includes("arms")) {
    return ["BICEPS", "TRICEPS", "SHOULDERS"];
  }
  if (label.includes("shoulder")) {
    return ["SHOULDERS", "TRICEPS"];
  }

  return ["CHEST", "BACK", "QUADS", "SHOULDERS", "CORE"];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const splitType = (searchParams.get("splitType") as SplitType | null) ?? "PUSH_PULL_LEGS";
  const goal = (searchParams.get("goal") as Goal | null) ?? "GENERAL_FITNESS";
  const labels = SPLIT_TEMPLATES[splitType] ?? SPLIT_TEMPLATES.CUSTOM;
  const rep = GOAL_REP_RANGES[goal];

  const recommendedDays = await Promise.all(
    labels.map(async (label) => {
      const groups = inferMuscleGroups(label);

      const recommendedExercises = await prisma.exercise.findMany({
        where: {
          muscleGroup: {
            in: groups,
          },
        },
        orderBy: [{ movementType: "asc" }, { name: "asc" }],
        take: 10,
        select: {
          id: true,
          name: true,
          muscleGroup: true,
          movementType: true,
        },
      });

      return {
        label,
        defaultRepLow: rep.low,
        defaultRepHigh: rep.high,
        defaultSets: 3,
        recommendedExercises,
      };
    }),
  );

  return NextResponse.json({
    recommendedDays,
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: auth },
      data: {
        goal: data.goal,
        experienceLevel: data.experienceLevel,
        coachingStyle: data.coachingStyle,
        units: data.units,
        calibrationLength: data.calibrationLength,
      },
    });

    const existingRoutines = await tx.routine.findMany({ where: { userId: auth }, select: { id: true } });
    if (existingRoutines.length) {
      await tx.routine.deleteMany({ where: { userId: auth } });
    }

    const routine = await tx.routine.create({
      data: {
        userId: auth,
        name: data.routineName,
        splitType: data.splitType,
      },
    });

    for (let dayIndex = 0; dayIndex < data.days.length; dayIndex += 1) {
      const day = data.days[dayIndex];
      const routineDay = await tx.routineDay.create({
        data: {
          routineId: routine.id,
          dayIndex,
          label: day.label,
        },
      });

      for (let exerciseIndex = 0; exerciseIndex < day.exercises.length; exerciseIndex += 1) {
        const ex = day.exercises[exerciseIndex];
        await tx.routineDayExercise.create({
          data: {
            routineDayId: routineDay.id,
            exerciseId: ex.exerciseId,
            orderIndex: exerciseIndex,
            targetSets: ex.targetSets,
            targetRepRangeLow: ex.targetRepRangeLow,
            targetRepRangeHigh: ex.targetRepRangeHigh,
          },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
