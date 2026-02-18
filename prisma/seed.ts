import {
  Goal,
  MuscleGroup,
  MovementType,
  PrismaClient,
  SplitType,
} from "@prisma/client";

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
  "1.5 Rep",
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
  const exercises = generateLargeLibrary();

  for (const exercise of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: {
        name: exercise.name,
        createdByUserId: null,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          muscleGroup: exercise.muscleGroup,
          movementType: exercise.movementType,
          equipment: exercise.equipment,
          defaultRestSec: exercise.defaultRestSec,
          fatigueFactor: exercise.fatigueFactor,
        },
      });
      continue;
    }

    await prisma.exercise.create({
      data: {
        ...exercise,
        isCustom: false,
      },
    });
  }
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

async function main() {
  await seedExercises();
  await seedDemoUser();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
