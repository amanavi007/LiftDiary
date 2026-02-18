import { NextResponse } from "next/server";
import { estimated1RM } from "@/lib/pr";
import { prisma } from "@/lib/prisma";
import { requireApiUserId } from "@/lib/server-auth";

const MAJOR_LIFTS = [
  "Barbell Bench Press",
  "Back Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
];

export async function GET() {
  const auth = await requireApiUserId();
  if (auth instanceof Response) return auth;

  const sets = await prisma.setEntry.findMany({
    where: {
      session: {
        userId: auth,
      },
    },
    include: {
      exercise: true,
      session: true,
    },
    orderBy: { timestamp: "asc" },
  });

  const byExercise = new Map<
    string,
    {
      name: string;
      bestWeight: number;
      repsAtBestWeight: number;
      bestE1RM: number;
      bestVolumeSet: number;
      trend: { date: string; e1rm: number }[];
    }
  >();

  for (const set of sets) {
    const key = set.exerciseId;
    const existing = byExercise.get(key) ?? {
      name: set.exercise.name,
      bestWeight: 0,
      repsAtBestWeight: 0,
      bestE1RM: 0,
      bestVolumeSet: 0,
      trend: [],
    };

    if (set.weight > existing.bestWeight || (set.weight === existing.bestWeight && set.reps > existing.repsAtBestWeight)) {
      existing.bestWeight = set.weight;
      existing.repsAtBestWeight = set.reps;
    }

    const e1rm = estimated1RM(set.weight, set.reps);
    if (e1rm > existing.bestE1RM) existing.bestE1RM = e1rm;

    const volumeSet = set.weight * set.reps;
    if (volumeSet > existing.bestVolumeSet) existing.bestVolumeSet = volumeSet;

    existing.trend.push({
      date: set.session.startedAt.toISOString().slice(0, 10),
      e1rm,
    });

    byExercise.set(key, existing);
  }

  const exercisePRs = Array.from(byExercise.values()).sort((a, b) => a.name.localeCompare(b.name));

  const majorLiftMap = new Map<string, number>();
  for (const entry of exercisePRs) {
    if (MAJOR_LIFTS.includes(entry.name)) {
      majorLiftMap.set(entry.name, entry.bestE1RM);
    }
  }

  return NextResponse.json({
    majorLifts: MAJOR_LIFTS.map((name) => ({ name, estimated1RM: Number((majorLiftMap.get(name) ?? 0).toFixed(1)) })),
    exercisePRs,
  });
}
