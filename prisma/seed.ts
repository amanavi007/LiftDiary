import {
  Goal,
  MuscleGroup,
  MovementType,
  PrismaClient,
  SplitType,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

type SeedExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  movementType: MovementType;
  equipment: string;
  defaultRestSec: number;
  fatigueFactor: number;
};

const BASE_EXERCISES: SeedExercise[] = [
  { name: "Barbell Bench Press", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 150, fatigueFactor: 1.2 },
  { name: "Incline Dumbbell Press", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 120, fatigueFactor: 1.1 },
  { name: "Chest Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Cable/Machine", defaultRestSec: 75, fatigueFactor: 0.9 },
  { name: "Pull-Up", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Bodyweight", defaultRestSec: 120, fatigueFactor: 1.2 },
  { name: "Barbell Row", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 130, fatigueFactor: 1.2 },
  { name: "Lat Pulldown", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Machine", defaultRestSec: 100, fatigueFactor: 1.0 },
  { name: "Overhead Press", muscleGroup: "SHOULDERS", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 140, fatigueFactor: 1.1 },
  { name: "Lateral Raise", muscleGroup: "SHOULDERS", movementType: "ISOLATION", equipment: "Dumbbell", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Rear Delt Fly", muscleGroup: "SHOULDERS", movementType: "ISOLATION", equipment: "Cable/Machine", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Barbell Curl", muscleGroup: "BICEPS", movementType: "ISOLATION", equipment: "Barbell", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Hammer Curl", muscleGroup: "BICEPS", movementType: "ISOLATION", equipment: "Dumbbell", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Triceps Pushdown", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Skull Crusher", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "EZ Bar", defaultRestSec: 70, fatigueFactor: 0.9 },
  { name: "Back Squat", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 180, fatigueFactor: 1.3 },
  { name: "Front Squat", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 160, fatigueFactor: 1.2 },
  { name: "Leg Press", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Machine", defaultRestSec: 120, fatigueFactor: 1.0 },
  { name: "Romanian Deadlift", muscleGroup: "HAMSTRINGS", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 140, fatigueFactor: 1.2 },
  { name: "Leg Curl", muscleGroup: "HAMSTRINGS", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 75, fatigueFactor: 0.9 },
  { name: "Hip Thrust", muscleGroup: "GLUTES", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 120, fatigueFactor: 1.1 },
  { name: "Standing Calf Raise", muscleGroup: "CALVES", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 45, fatigueFactor: 0.6 },
  { name: "Seated Calf Raise", muscleGroup: "CALVES", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 45, fatigueFactor: 0.6 },
  { name: "Cable Crunch", muscleGroup: "CORE", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 45, fatigueFactor: 0.6 },
  { name: "Plank", muscleGroup: "CORE", movementType: "ISOLATION", equipment: "Bodyweight", defaultRestSec: 45, fatigueFactor: 0.5 },
  { name: "Deadlift", muscleGroup: "FULL_BODY", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 180, fatigueFactor: 1.4 },
];

const CURATED_EXERCISES: SeedExercise[] = [
  { name: "Dips", muscleGroup: "TRICEPS", movementType: "COMPOUND", equipment: "Bodyweight", defaultRestSec: 90, fatigueFactor: 1.0 },
  { name: "Weighted Dips", muscleGroup: "TRICEPS", movementType: "COMPOUND", equipment: "Dip Belt", defaultRestSec: 120, fatigueFactor: 1.1 },
  { name: "Bench Dips", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Bench", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Tricep Extension", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable/Dumbbell", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Triceps Extension", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable/Dumbbell", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Overhead Triceps Extension", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable/Dumbbell", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Cable Overhead Triceps Extension", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Single-Arm Triceps Pushdown", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 55, fatigueFactor: 0.75 },
  { name: "Rope Pushdown", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Reverse Grip Pushdown", muscleGroup: "TRICEPS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },

  { name: "Pec Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Machine/Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Pec Flys", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Machine/Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Pec Deck", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Machine Pec Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Cable Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "High-to-Low Cable Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Low-to-High Cable Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Incline Dumbbell Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Dumbbell", defaultRestSec: 65, fatigueFactor: 0.85 },
  { name: "Decline Dumbbell Fly", muscleGroup: "CHEST", movementType: "ISOLATION", equipment: "Dumbbell", defaultRestSec: 65, fatigueFactor: 0.85 },
  { name: "Flat Dumbbell Press", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 110, fatigueFactor: 1.05 },
  { name: "Incline Barbell Bench Press", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 130, fatigueFactor: 1.15 },
  { name: "Decline Barbell Bench Press", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 130, fatigueFactor: 1.15 },
  { name: "Machine Chest Press", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Machine", defaultRestSec: 100, fatigueFactor: 1.0 },
  { name: "Push-Up", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Bodyweight", defaultRestSec: 60, fatigueFactor: 0.85 },
  { name: "Weighted Push-Up", muscleGroup: "CHEST", movementType: "COMPOUND", equipment: "Bodyweight/Plate", defaultRestSec: 80, fatigueFactor: 0.95 },

  { name: "Seated Cable Row", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Cable", defaultRestSec: 100, fatigueFactor: 1.0 },
  { name: "Chest-Supported Row", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Machine/Dumbbell", defaultRestSec: 100, fatigueFactor: 1.0 },
  { name: "T-Bar Row", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Barbell/Machine", defaultRestSec: 120, fatigueFactor: 1.1 },
  { name: "Single-Arm Dumbbell Row", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 90, fatigueFactor: 0.95 },
  { name: "Straight-Arm Pulldown", muscleGroup: "BACK", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Face Pull", muscleGroup: "SHOULDERS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Rack Pull", muscleGroup: "BACK", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 160, fatigueFactor: 1.25 },

  { name: "Arnold Press", muscleGroup: "SHOULDERS", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 100, fatigueFactor: 1.0 },
  { name: "Seated Dumbbell Shoulder Press", muscleGroup: "SHOULDERS", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 100, fatigueFactor: 1.0 },
  { name: "Machine Shoulder Press", muscleGroup: "SHOULDERS", movementType: "COMPOUND", equipment: "Machine", defaultRestSec: 90, fatigueFactor: 0.95 },
  { name: "Cable Lateral Raise", muscleGroup: "SHOULDERS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 55, fatigueFactor: 0.75 },
  { name: "Front Raise", muscleGroup: "SHOULDERS", movementType: "ISOLATION", equipment: "Dumbbell/Plate", defaultRestSec: 55, fatigueFactor: 0.75 },
  { name: "Reverse Pec Deck", muscleGroup: "SHOULDERS", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Upright Row", muscleGroup: "SHOULDERS", movementType: "COMPOUND", equipment: "Barbell/Cable", defaultRestSec: 80, fatigueFactor: 0.9 },

  { name: "Preacher Curl", muscleGroup: "BICEPS", movementType: "ISOLATION", equipment: "EZ Bar/Machine", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Incline Dumbbell Curl", muscleGroup: "BICEPS", movementType: "ISOLATION", equipment: "Dumbbell", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Cable Curl", muscleGroup: "BICEPS", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Spider Curl", muscleGroup: "BICEPS", movementType: "ISOLATION", equipment: "Dumbbell/EZ Bar", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Concentration Curl", muscleGroup: "BICEPS", movementType: "ISOLATION", equipment: "Dumbbell", defaultRestSec: 55, fatigueFactor: 0.75 },

  { name: "Bulgarian Split Squat", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Dumbbell/Barbell", defaultRestSec: 110, fatigueFactor: 1.05 },
  { name: "Hack Squat", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Machine", defaultRestSec: 120, fatigueFactor: 1.05 },
  { name: "Goblet Squat", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 90, fatigueFactor: 0.95 },
  { name: "Leg Extension", muscleGroup: "QUADS", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 60, fatigueFactor: 0.8 },
  { name: "Walking Lunge", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 90, fatigueFactor: 1.0 },
  { name: "Step-Up", muscleGroup: "QUADS", movementType: "COMPOUND", equipment: "Dumbbell", defaultRestSec: 80, fatigueFactor: 0.9 },

  { name: "Stiff-Leg Deadlift", muscleGroup: "HAMSTRINGS", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 130, fatigueFactor: 1.1 },
  { name: "Seated Leg Curl", muscleGroup: "HAMSTRINGS", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 70, fatigueFactor: 0.85 },
  { name: "Nordic Curl", muscleGroup: "HAMSTRINGS", movementType: "ISOLATION", equipment: "Bodyweight", defaultRestSec: 90, fatigueFactor: 1.0 },
  { name: "Good Morning", muscleGroup: "HAMSTRINGS", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 120, fatigueFactor: 1.05 },

  { name: "Barbell Hip Thrust", muscleGroup: "GLUTES", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 120, fatigueFactor: 1.1 },
  { name: "Glute Bridge", muscleGroup: "GLUTES", movementType: "COMPOUND", equipment: "Bodyweight/Barbell", defaultRestSec: 90, fatigueFactor: 0.95 },
  { name: "Cable Kickback", muscleGroup: "GLUTES", movementType: "ISOLATION", equipment: "Cable", defaultRestSec: 55, fatigueFactor: 0.75 },
  { name: "Abduction Machine", muscleGroup: "GLUTES", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 55, fatigueFactor: 0.75 },

  { name: "Donkey Calf Raise", muscleGroup: "CALVES", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 45, fatigueFactor: 0.6 },
  { name: "Single-Leg Calf Raise", muscleGroup: "CALVES", movementType: "ISOLATION", equipment: "Bodyweight", defaultRestSec: 45, fatigueFactor: 0.6 },
  { name: "Leg Press Calf Raise", muscleGroup: "CALVES", movementType: "ISOLATION", equipment: "Machine", defaultRestSec: 45, fatigueFactor: 0.6 },

  { name: "Hanging Leg Raise", muscleGroup: "CORE", movementType: "ISOLATION", equipment: "Bodyweight", defaultRestSec: 45, fatigueFactor: 0.6 },
  { name: "Ab Wheel Rollout", muscleGroup: "CORE", movementType: "ISOLATION", equipment: "Ab Wheel", defaultRestSec: 50, fatigueFactor: 0.65 },
  { name: "Russian Twist", muscleGroup: "CORE", movementType: "ISOLATION", equipment: "Bodyweight/Plate", defaultRestSec: 40, fatigueFactor: 0.55 },
  { name: "Side Plank", muscleGroup: "CORE", movementType: "ISOLATION", equipment: "Bodyweight", defaultRestSec: 40, fatigueFactor: 0.5 },
  { name: "Decline Sit-Up", muscleGroup: "CORE", movementType: "ISOLATION", equipment: "Bench", defaultRestSec: 45, fatigueFactor: 0.6 },

  { name: "Power Clean", muscleGroup: "FULL_BODY", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 170, fatigueFactor: 1.35 },
  { name: "Clean and Press", muscleGroup: "FULL_BODY", movementType: "COMPOUND", equipment: "Barbell", defaultRestSec: 170, fatigueFactor: 1.35 },
  { name: "Thruster", muscleGroup: "FULL_BODY", movementType: "COMPOUND", equipment: "Barbell/Dumbbell", defaultRestSec: 140, fatigueFactor: 1.2 },
  { name: "Farmer Carry", muscleGroup: "FULL_BODY", movementType: "COMPOUND", equipment: "Dumbbell/Trap Bar", defaultRestSec: 90, fatigueFactor: 1.0 },
  { name: "Kettlebell Swing", muscleGroup: "FULL_BODY", movementType: "COMPOUND", equipment: "Kettlebell", defaultRestSec: 80, fatigueFactor: 0.95 },
];

const VARIATIONS = [
  "Paused",
  "Tempo",
  "Wide-Grip",
  "Close-Grip",
  "Machine",
  "Cable",
  "Dumbbell",
  "Smith Machine",
];

const COMPOUND_PREFIXES = [
  "Paused",
  "Tempo",
  "Explosive",
  "Heavy",
  "Volume",
  "Strict",
  "Deficit",
  "Power",
  "Cluster",
];

const ISOLATION_PREFIXES = [
  "Tempo",
  "Slow Eccentric",
  "Peak Contraction",
  "Drop Set",
  "Rest-Pause",
  "Partial",
  "Strict",
  "Single-Arm",
  "Single-Leg",
  "Banded",
];

const UPPER_BODY_SUFFIXES = [
  "Neutral Grip",
  "Pronated Grip",
  "Supinated Grip",
  "Wide Grip",
  "Close Grip",
  "Single-Arm",
];

const LOWER_BODY_SUFFIXES = [
  "Wide Stance",
  "Narrow Stance",
  "Staggered Stance",
  "Paused Bottom",
  "Tempo Down",
  "Explosive Up",
];

const CORE_SUFFIXES = [
  "Weighted",
  "Bodyweight",
  "Slow Tempo",
  "Paused",
  "High Rep",
  "Controlled",
];

function buildVariantPrefixes(exercise: SeedExercise) {
  const prefixes = exercise.movementType === "COMPOUND" ? COMPOUND_PREFIXES : ISOLATION_PREFIXES;
  return prefixes;
}

function buildVariantSuffixes(exercise: SeedExercise) {
  if (exercise.muscleGroup === "CORE") return CORE_SUFFIXES;
  if (["QUADS", "HAMSTRINGS", "GLUTES", "CALVES"].includes(exercise.muscleGroup)) return LOWER_BODY_SUFFIXES;
  if (["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "FULL_BODY"].includes(exercise.muscleGroup)) return UPPER_BODY_SUFFIXES;
  return [];
}

function generateLargeLibrary(): SeedExercise[] {
  const source: SeedExercise[] = [...BASE_EXERCISES, ...CURATED_EXERCISES];
  const generated: SeedExercise[] = [...source];

  for (const base of BASE_EXERCISES) {
    for (const variation of VARIATIONS) {
      generated.push({
        ...base,
        name: `${variation} ${base.name}`,
      });
    }
  }

  for (const exercise of source) {
    const prefixes = buildVariantPrefixes(exercise);
    const suffixes = buildVariantSuffixes(exercise);

    for (const prefix of prefixes) {
      generated.push({
        ...exercise,
        name: `${prefix} ${exercise.name}`,
      });
    }

    for (const suffix of suffixes) {
      generated.push({
        ...exercise,
        name: `${exercise.name} (${suffix})`,
      });
    }

    for (const prefix of prefixes.slice(0, 4)) {
      for (const suffix of suffixes.slice(0, 3)) {
        generated.push({
          ...exercise,
          name: `${prefix} ${exercise.name} (${suffix})`,
        });
      }
    }
  }

  const dedup = new Map<string, SeedExercise>();
  for (const ex of generated) {
    dedup.set(ex.name.toLowerCase(), ex);
  }

  return Array.from(dedup.values());
}

async function seedExercises() {
  console.log('🌱 Starting exercise seed...');
  const exercises = generateLargeLibrary();
  console.log(`📊 Generated ${exercises.length} exercises to seed`);

  const existingSystem = await prisma.exercise.findMany({
    where: { createdByUserId: null },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  const primaryByName = new Map<string, string>();
  const duplicateIds: string[] = [];

  for (const item of existingSystem) {
    const key = item.name.toLowerCase();
    if (!primaryByName.has(key)) {
      primaryByName.set(key, item.id);
      continue;
    }
    duplicateIds.push(item.id);
  }

  for (const duplicateId of duplicateIds) {
    const duplicate = existingSystem.find((item) => item.id === duplicateId);
    if (!duplicate) continue;

    const targetId = primaryByName.get(duplicate.name.toLowerCase());
    if (!targetId || targetId === duplicateId) continue;

    await prisma.$transaction([
      prisma.routineDayExercise.updateMany({ where: { exerciseId: duplicateId }, data: { exerciseId: targetId } }),
      prisma.setEntry.updateMany({ where: { exerciseId: duplicateId }, data: { exerciseId: targetId } }),
      prisma.recommendation.updateMany({ where: { exerciseId: duplicateId }, data: { exerciseId: targetId } }),
    ]);

    await prisma.exercise.delete({ where: { id: duplicateId } });
  }

  const canonical = await prisma.exercise.findMany({
    where: { createdByUserId: null },
    select: { id: true, name: true },
  });
  const canonicalByName = new Map(canonical.map((item) => [item.name.toLowerCase(), item.id] as const));

  for (const ex of exercises) {
    const key = ex.name.toLowerCase();
    const existingId = canonicalByName.get(key);

    if (existingId) {
      await prisma.exercise.update({
        where: { id: existingId },
        data: {
          muscleGroup: ex.muscleGroup,
          movementType: ex.movementType,
          equipment: ex.equipment,
          defaultRestSec: ex.defaultRestSec,
          fatigueFactor: ex.fatigueFactor,
          isCustom: false,
          createdByUserId: null,
        },
      });
      continue;
    }

    const created = await prisma.exercise.create({
      data: {
        ...ex,
        isCustom: false,
      },
      select: { id: true },
    });

    canonicalByName.set(key, created.id);
  }

  const systemExerciseCount = await prisma.exercise.count({
    where: { createdByUserId: null },
  });

  console.log(`✅ Exercises seeded successfully (${systemExerciseCount} total system exercises)`);
}

async function seedDemoUser() {
  const demo = await prisma.user.upsert({
    where: { email: "demo@liftdiary.app" },
    update: {},
    create: {
      email: "demo@liftdiary.app",
      passwordHash: "$2b$10$wWBZePvP7f8qDxnQ4M7epu27hfFx5f8zIjE7Nu1ILK4QK1KTiCT6i",
      goal: Goal.HYPERTROPHY,
      experienceLevel: "INTERMEDIATE",
      coachingStyle: "BALANCED",
      units: "LB",
      preferredRestSeconds: 150,
      workoutsCompletedInCalibration: 2,
      calibrationComplete: false,
      calibrationLength: 7,
    },
  });

  const routine = await prisma.routine.upsert({
    where: { id: `${demo.id}-default-routine` },
    update: {},
    create: {
      id: `${demo.id}-default-routine`,
      userId: demo.id,
      name: "Demo PPL",
      splitType: SplitType.PUSH_PULL_LEGS,
    },
  });

  const days = ["Push", "Pull", "Legs"];
  for (let i = 0; i < days.length; i += 1) {
    await prisma.routineDay.upsert({
      where: { routineId_dayIndex: { routineId: routine.id, dayIndex: i } },
      update: { label: days[i] },
      create: {
        routineId: routine.id,
        dayIndex: i,
        label: days[i],
      },
    });
  }
}

type CalibratedExerciseSeed = {
  name: string;
  targetSets: number;
  targetRepRangeLow: number;
  targetRepRangeHigh: number;
  startWeight: number;
};

const CALIBRATED_SPLIT: Array<{ label: string; exercises: CalibratedExerciseSeed[] }> = [
  {
    label: "Push",
    exercises: [
      { name: "Barbell Bench Press", targetSets: 3, targetRepRangeLow: 6, targetRepRangeHigh: 10, startWeight: 135 },
      { name: "Incline Dumbbell Press", targetSets: 3, targetRepRangeLow: 8, targetRepRangeHigh: 12, startWeight: 50 },
      { name: "Triceps Pushdown", targetSets: 3, targetRepRangeLow: 10, targetRepRangeHigh: 14, startWeight: 70 },
    ],
  },
  {
    label: "Pull",
    exercises: [
      { name: "Barbell Row", targetSets: 3, targetRepRangeLow: 6, targetRepRangeHigh: 10, startWeight: 125 },
      { name: "Lat Pulldown", targetSets: 3, targetRepRangeLow: 8, targetRepRangeHigh: 12, startWeight: 120 },
      { name: "Barbell Curl", targetSets: 3, targetRepRangeLow: 10, targetRepRangeHigh: 14, startWeight: 55 },
    ],
  },
  {
    label: "Legs",
    exercises: [
      { name: "Back Squat", targetSets: 3, targetRepRangeLow: 5, targetRepRangeHigh: 8, startWeight: 185 },
      { name: "Romanian Deadlift", targetSets: 3, targetRepRangeLow: 6, targetRepRangeHigh: 10, startWeight: 165 },
      { name: "Leg Press", targetSets: 3, targetRepRangeLow: 10, targetRepRangeHigh: 15, startWeight: 250 },
    ],
  },
];

async function getSystemExerciseId(name: string) {
  const exercise = await prisma.exercise.findFirst({
    where: {
      name,
      createdByUserId: null,
    },
    select: {
      id: true,
    },
  });

  if (!exercise) {
    throw new Error(`Missing seeded exercise: ${name}`);
  }

  return exercise.id;
}

async function seedCalibratedUser() {
  const passwordHash = await hash("demo123", 10);

  const calibrated = await prisma.user.upsert({
    where: { email: "calibrated@liftdiary.app" },
    update: {
      passwordHash,
      goal: Goal.HYPERTROPHY,
      experienceLevel: "INTERMEDIATE",
      coachingStyle: "BALANCED",
      units: "LB",
      preferredRestSeconds: 150,
      workoutsCompletedInCalibration: 12,
      calibrationComplete: true,
      calibrationLength: 7,
    },
    create: {
      email: "calibrated@liftdiary.app",
      passwordHash,
      goal: Goal.HYPERTROPHY,
      experienceLevel: "INTERMEDIATE",
      coachingStyle: "BALANCED",
      units: "LB",
      preferredRestSeconds: 150,
      workoutsCompletedInCalibration: 12,
      calibrationComplete: true,
      calibrationLength: 7,
    },
  });

  await prisma.recommendation.deleteMany({ where: { userId: calibrated.id } });
  await prisma.workoutSession.deleteMany({ where: { userId: calibrated.id } });

  const routine = await prisma.routine.upsert({
    where: { id: `${calibrated.id}-calibrated-routine` },
    update: {
      name: "Calibrated PPL",
      splitType: SplitType.PUSH_PULL_LEGS,
    },
    create: {
      id: `${calibrated.id}-calibrated-routine`,
      userId: calibrated.id,
      name: "Calibrated PPL",
      splitType: SplitType.PUSH_PULL_LEGS,
    },
  });

  const routineDays = [] as Array<{ id: string; label: string; exercises: CalibratedExerciseSeed[] }>;

  for (let i = 0; i < CALIBRATED_SPLIT.length; i += 1) {
    const templateDay = CALIBRATED_SPLIT[i];
    const day = await prisma.routineDay.upsert({
      where: { routineId_dayIndex: { routineId: routine.id, dayIndex: i } },
      update: { label: templateDay.label },
      create: {
        routineId: routine.id,
        dayIndex: i,
        label: templateDay.label,
      },
      select: { id: true, label: true },
    });

    await prisma.routineDayExercise.deleteMany({ where: { routineDayId: day.id } });

    for (let j = 0; j < templateDay.exercises.length; j += 1) {
      const ex = templateDay.exercises[j];
      const exerciseId = await getSystemExerciseId(ex.name);

      await prisma.routineDayExercise.create({
        data: {
          routineDayId: day.id,
          exerciseId,
          orderIndex: j,
          targetSets: ex.targetSets,
          targetRepRangeLow: ex.targetRepRangeLow,
          targetRepRangeHigh: ex.targetRepRangeHigh,
        },
      });
    }

    routineDays.push({
      id: day.id,
      label: day.label,
      exercises: templateDay.exercises,
    });
  }

  const sessionsToCreate = 12;

  for (let i = 0; i < sessionsToCreate; i += 1) {
    const dayIndex = i % routineDays.length;
    const routineDay = routineDays[dayIndex];
    const progressionBlock = Math.floor(i / routineDays.length);

    const startedAt = new Date(Date.now() - (sessionsToCreate - i) * 48 * 60 * 60 * 1000);
    const endedAt = new Date(startedAt.getTime() + 50 * 60 * 1000);

    const session = await prisma.workoutSession.create({
      data: {
        userId: calibrated.id,
        routineDayId: routineDay.id,
        startedAt,
        endedAt,
        coachingStyleSnapshot: "BALANCED",
        goalSnapshot: Goal.HYPERTROPHY,
        unitsSnapshot: "LB",
      },
      select: { id: true },
    });

    for (const ex of routineDay.exercises) {
      const exerciseId = await getSystemExerciseId(ex.name);
      const weightBase = ex.startWeight + progressionBlock * 2.5;

      for (let setIndex = 1; setIndex <= ex.targetSets; setIndex += 1) {
        const repsSpan = ex.targetRepRangeHigh - ex.targetRepRangeLow + 1;
        const reps = ex.targetRepRangeLow + ((i + setIndex) % Math.max(1, repsSpan));

        await prisma.setEntry.create({
          data: {
            sessionId: session.id,
            exerciseId,
            setIndex,
            weight: weightBase,
            reps,
            timestamp: new Date(startedAt.getTime() + setIndex * 6 * 60 * 1000),
            isFailed: false,
          },
        });
      }
    }
  }

  console.log("✅ Calibrated dummy account ready: calibrated@liftdiary.app / demo123");
}

async function main() {
  await seedExercises();
  await seedDemoUser();
  await seedCalibratedUser();
}

main()
  .then(async () => {
    console.log('✅ Database seeded successfully!');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
