/**
 * Creates a demo test account with:
 * - Complete onboarding (PPL split, Hypertrophy goal, Intermediate)
 * - 10 completed workout sessions spanning last 5 weeks
 * - Progressive overload simulated across all exercises
 * - Calibration complete
 *
 * Run with: npx tsx scripts/create-test-account.ts
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = "demo@liftdiary.app";
const PASSWORD = "LiftDemo2026!";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}

async function main() {
  // Clean up existing demo account if it exists
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    await prisma.user.delete({ where: { email: EMAIL } });
    console.log("Removed existing demo account.");
  }

  const passwordHash = await hash(PASSWORD, 10);

  // ─── Create user ────────────────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash,
      goal: "HYPERTROPHY",
      experienceLevel: "INTERMEDIATE",
      coachingStyle: "BALANCED",
      units: "LB",
      preferredRestSeconds: 150,
      calibrationLength: 7,
      workoutsCompletedInCalibration: 7,
      calibrationComplete: true,
    },
  });

  // ─── Look up required exercises ─────────────────────────────────────────────
  const exerciseNames = [
    "Barbell Bench Press",
    "Incline Dumbbell Press",
    "Chest Fly",
    "Overhead Press",
    "Lateral Raise",
    "Triceps Pushdown",
    "Skull Crusher",
    "Barbell Row",
    "Pull-Up",
    "Lat Pulldown",
    "Barbell Curl",
    "Hammer Curl",
    "Rear Delt Fly",
    "Back Squat",
    "Romanian Deadlift",
    "Leg Press",
    "Leg Curl",
    "Standing Calf Raise",
    "Hip Thrust",
  ];

  const exercises = await prisma.exercise.findMany({
    where: { name: { in: exerciseNames } },
  });

  function ex(name: string) {
    const found = exercises.find((e) => e.name === name);
    if (!found) throw new Error(`Exercise not found in DB: "${name}". Run npm run db:seed first.`);
    return found;
  }

  // ─── Create PPL routine ─────────────────────────────────────────────────────
  const routine = await prisma.routine.create({
    data: {
      userId: user.id,
      name: "PPL Hypertrophy",
      splitType: "PUSH_PULL_LEGS",
    },
  });

  const pushDay = await prisma.routineDay.create({
    data: { routineId: routine.id, dayIndex: 0, label: "Push" },
  });
  const pullDay = await prisma.routineDay.create({
    data: { routineId: routine.id, dayIndex: 1, label: "Pull" },
  });
  const legsDay = await prisma.routineDay.create({
    data: { routineId: routine.id, dayIndex: 2, label: "Legs" },
  });

  // Push exercises
  const pushExercises = [
    { name: "Barbell Bench Press", sets: 4, low: 8, high: 12 },
    { name: "Incline Dumbbell Press", sets: 3, low: 8, high: 12 },
    { name: "Chest Fly", sets: 3, low: 12, high: 15 },
    { name: "Overhead Press", sets: 3, low: 8, high: 10 },
    { name: "Lateral Raise", sets: 3, low: 12, high: 15 },
    { name: "Triceps Pushdown", sets: 3, low: 10, high: 15 },
    { name: "Skull Crusher", sets: 3, low: 8, high: 12 },
  ];

  // Pull exercises
  const pullExercises = [
    { name: "Barbell Row", sets: 4, low: 8, high: 12 },
    { name: "Pull-Up", sets: 3, low: 6, high: 10 },
    { name: "Lat Pulldown", sets: 3, low: 10, high: 12 },
    { name: "Barbell Curl", sets: 3, low: 10, high: 12 },
    { name: "Hammer Curl", sets: 3, low: 10, high: 12 },
    { name: "Rear Delt Fly", sets: 3, low: 12, high: 15 },
  ];

  // Legs exercises
  const legsExercises = [
    { name: "Back Squat", sets: 4, low: 6, high: 10 },
    { name: "Romanian Deadlift", sets: 3, low: 8, high: 12 },
    { name: "Leg Press", sets: 3, low: 10, high: 15 },
    { name: "Leg Curl", sets: 3, low: 10, high: 15 },
    { name: "Hip Thrust", sets: 3, low: 10, high: 15 },
    { name: "Standing Calf Raise", sets: 4, low: 15, high: 20 },
  ];

  for (const [i, item] of pushExercises.entries()) {
    await prisma.routineDayExercise.create({
      data: {
        routineDayId: pushDay.id,
        exerciseId: ex(item.name).id,
        orderIndex: i,
        targetSets: item.sets,
        targetRepRangeLow: item.low,
        targetRepRangeHigh: item.high,
      },
    });
  }
  for (const [i, item] of pullExercises.entries()) {
    await prisma.routineDayExercise.create({
      data: {
        routineDayId: pullDay.id,
        exerciseId: ex(item.name).id,
        orderIndex: i,
        targetSets: item.sets,
        targetRepRangeLow: item.low,
        targetRepRangeHigh: item.high,
      },
    });
  }
  for (const [i, item] of legsExercises.entries()) {
    await prisma.routineDayExercise.create({
      data: {
        routineDayId: legsDay.id,
        exerciseId: ex(item.name).id,
        orderIndex: i,
        targetSets: item.sets,
        targetRepRangeLow: item.low,
        targetRepRangeHigh: item.high,
      },
    });
  }

  // ─── Simulate 10 sessions with progressive overload ─────────────────────────
  // Sessions spread over last 5 weeks: PPL PPL PPL PP (10 sessions)
  const sessionSchedule: { day: typeof pushDay; exercises: typeof pushExercises; daysBack: number }[] = [
    { day: pushDay, exercises: pushExercises, daysBack: 34 },
    { day: pullDay, exercises: pullExercises, daysBack: 32 },
    { day: legsDay, exercises: legsExercises, daysBack: 30 },
    { day: pushDay, exercises: pushExercises, daysBack: 27 },
    { day: pullDay, exercises: pullExercises, daysBack: 25 },
    { day: legsDay, exercises: legsExercises, daysBack: 23 },
    { day: pushDay, exercises: pushExercises, daysBack: 20 },
    { day: pullDay, exercises: pullExercises, daysBack: 18 },
    { day: legsDay, exercises: legsExercises, daysBack: 16 },
    { day: pushDay, exercises: pushExercises, daysBack: 13 },
    { day: pullDay, exercises: pullExercises, daysBack: 11 },
    { day: legsDay, exercises: legsExercises, daysBack: 9 },
    { day: pushDay, exercises: pushExercises, daysBack: 6 },
    { day: pullDay, exercises: pullExercises, daysBack: 4 },
    { day: legsDay, exercises: legsExercises, daysBack: 2 },
  ];

  // Base weights for each exercise (in lb)
  const baseWeights: Record<string, number> = {
    "Barbell Bench Press": 155,
    "Incline Dumbbell Press": 55,
    "Chest Fly": 30,
    "Overhead Press": 95,
    "Lateral Raise": 20,
    "Triceps Pushdown": 50,
    "Skull Crusher": 65,
    "Barbell Row": 135,
    "Pull-Up": 0,       // bodyweight — logged as 0
    "Lat Pulldown": 100,
    "Barbell Curl": 65,
    "Hammer Curl": 30,
    "Rear Delt Fly": 20,
    "Back Squat": 185,
    "Romanian Deadlift": 145,
    "Leg Press": 270,
    "Leg Curl": 75,
    "Hip Thrust": 155,
    "Standing Calf Raise": 90,
  };

  // Track current weights per exercise for progressive overload
  const currentWeights = { ...baseWeights };

  for (const [sessionIndex, schedule] of sessionSchedule.entries()) {
    const startedAt = daysAgo(schedule.daysBack);
    const endedAt = new Date(startedAt.getTime() + 60 * 60 * 1000); // 60 min sessions

    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        routineDayId: schedule.day.id,
        startedAt,
        endedAt,
        coachingStyleSnapshot: "BALANCED",
        goalSnapshot: "HYPERTROPHY",
        unitsSnapshot: "LB",
      },
    });

    // Add progressive overload every 3 sessions (~every full PPL cycle)
    if (sessionIndex > 0 && sessionIndex % 3 === 0) {
      for (const item of schedule.exercises) {
        const step = item.name === "Back Squat" || item.name === "Romanian Deadlift" || item.name === "Leg Press"
          ? 5
          : 2.5;
        if (currentWeights[item.name] > 0) {
          currentWeights[item.name] = roundToNearest(currentWeights[item.name] + step, step);
        }
      }
    }

    let setTimestamp = new Date(startedAt.getTime() + 2 * 60 * 1000);

    for (const item of schedule.exercises) {
      const weight = currentWeights[item.name];

      for (let setIndex = 1; setIndex <= item.sets; setIndex++) {
        // Last set occasionally slightly under target (realistic fatigue)
        const fatiguedReps = setIndex === item.sets
          ? Math.max(item.low, item.high - 2)
          : item.high;

        await prisma.setEntry.create({
          data: {
            sessionId: session.id,
            exerciseId: ex(item.name).id,
            setIndex,
            weight,
            reps: fatiguedReps,
            isFailed: false,
            timestamp: new Date(setTimestamp.getTime()),
          },
        });

        setTimestamp = new Date(setTimestamp.getTime() + 2.5 * 60 * 1000);
      }
    }
  }

  console.log("\n✓ Demo account created successfully!\n");
  console.log("  Email:    ", EMAIL);
  console.log("  Password: ", PASSWORD);
  console.log("\n  Sessions: 15 (across 5 weeks of PPL)");
  console.log("  Calibration: complete");
  console.log("  Goal: Hypertrophy | Split: Push/Pull/Legs | Units: LB\n");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
