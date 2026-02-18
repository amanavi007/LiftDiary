import {
  CoachingStyle,
  Goal,
  MovementType,
  Recommendation,
  SetEntry,
  Units,
  WorkoutSession,
} from "@prisma/client";
import { GOAL_REP_RANGES, WEIGHT_CAPS_KG, WEIGHT_CAPS_LB } from "@/lib/defaults";
import { estimated1RM, roundWeight } from "@/lib/pr";

type SessionWithSets = WorkoutSession & { sets: SetEntry[] };

export type RecommendationResult = Pick<
  Recommendation,
  | "recommendedWeight"
  | "recommendedRepLow"
  | "recommendedRepHigh"
  | "recommendedSets"
  | "confidenceScore"
  | "modelVersion"
  | "reasonText"
>;

function styleFactor(style: CoachingStyle) {
  if (style === "CONSERVATIVE") return 0.75;
  if (style === "AGGRESSIVE") return 1.3;
  return 1;
}

function oneHotGoal(goal: Goal) {
  return [
    goal === "STRENGTH" ? 1 : 0,
    goal === "HYPERTROPHY" ? 1 : 0,
    goal === "ENDURANCE" ? 1 : 0,
    goal === "GENERAL_FITNESS" ? 1 : 0,
  ];
}

function buildFeatureVector(args: {
  previousWeight: number;
  achievedReps: number;
  movingE1RM: number;
  daysSinceLast: number;
  coachingStyle: CoachingStyle;
  goal: Goal;
}) {
  return [
    1,
    args.previousWeight,
    args.achievedReps,
    args.movingE1RM,
    args.daysSinceLast,
    args.coachingStyle === "CONSERVATIVE" ? 1 : 0,
    args.coachingStyle === "BALANCED" ? 1 : 0,
    args.coachingStyle === "AGGRESSIVE" ? 1 : 0,
    ...oneHotGoal(args.goal),
  ];
}

function dot(a: number[], b: number[]) {
  return a.reduce((acc, value, i) => acc + value * (b[i] ?? 0), 0);
}

function fitLinearRegression(features: number[][], targets: number[], iterations = 1200, lr = 0.000001) {
  const nFeatures = features[0]?.length ?? 0;
  if (!nFeatures) return null;

  const weights = Array(nFeatures).fill(0);

  for (let iter = 0; iter < iterations; iter += 1) {
    const gradients = Array(nFeatures).fill(0);

    for (let i = 0; i < features.length; i += 1) {
      const pred = dot(features[i], weights);
      const error = pred - targets[i];
      for (let j = 0; j < nFeatures; j += 1) {
        gradients[j] += (2 / features.length) * error * features[i][j];
      }
    }

    for (let j = 0; j < nFeatures; j += 1) {
      weights[j] -= lr * gradients[j];
    }
  }

  const mean = targets.reduce((acc, t) => acc + t, 0) / targets.length;
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < features.length; i += 1) {
    const pred = dot(features[i], weights);
    ssRes += (targets[i] - pred) ** 2;
    ssTot += (targets[i] - mean) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { weights, r2 };
}

export function computeDeterministicRecommendation(args: {
  lastWeight: number;
  lastBestReps: number;
  targetLow: number;
  targetHigh: number;
  movementType: MovementType;
  coachingStyle: CoachingStyle;
  units: Units;
  targetSets: number;
}) {
  const style = args.coachingStyle;
  const movement = args.movementType;

  let pct = 0;
  if (args.lastBestReps >= args.targetHigh + 1) {
    if (style === "CONSERVATIVE") pct = 0.025;
    if (style === "BALANCED") pct = movement === "COMPOUND" ? 0.05 : 0.025;
    if (style === "AGGRESSIVE") pct = movement === "COMPOUND" ? 0.075 : 0.05;
  } else if (args.lastBestReps < args.targetLow) {
    pct = -0.025;
  }

  const caps = args.units === "LB" ? WEIGHT_CAPS_LB : WEIGHT_CAPS_KG;
  const cap = movement === "COMPOUND" ? caps.lower : caps.upper;

  const rawDelta = args.lastWeight * pct;
  const boundedDelta = Math.max(-cap, Math.min(cap, rawDelta));
  const next = Math.max(0, args.lastWeight + boundedDelta);

  return {
    recommendedWeight: roundWeight(next, args.units),
    recommendedRepLow: args.targetLow,
    recommendedRepHigh: args.targetHigh,
    recommendedSets: args.targetSets,
    confidenceScore: 0.55,
    modelVersion: "deterministic-v1",
    reasonText:
      pct > 0
        ? `You exceeded the rep target last session; increasing load ${Math.round(Math.abs(pct * 100))}%.`
        : pct < 0
          ? "Last set performance dipped under target; easing load slightly for quality reps."
          : "Holding load steady to build consistency at this rep range.",
  } satisfies RecommendationResult;
}

export function buildRecommendation(args: {
  sessions: SessionWithSets[];
  calibrationComplete: boolean;
  calibrationLength: number;
  workoutsCompleted: number;
  goal: Goal;
  coachingStyle: CoachingStyle;
  movementType: MovementType;
  units: Units;
  defaultSets: number;
}) {
  const repTarget = GOAL_REP_RANGES[args.goal];

  const sorted = [...args.sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  const latest = sorted.at(-1);
  const latestSets = latest?.sets ?? [];
  const latestBestWeight = latestSets.reduce((m, set) => Math.max(m, set.weight), 0);
  const latestBestReps = latestSets
    .filter((set) => set.weight === latestBestWeight)
    .reduce((m, set) => Math.max(m, set.reps), 0);

  if (!latest || args.workoutsCompleted < args.calibrationLength || !args.calibrationComplete) {
    return {
      recommendedWeight: latestBestWeight || 0,
      recommendedRepLow: repTarget.low,
      recommendedRepHigh: repTarget.high,
      recommendedSets: args.defaultSets,
      confidenceScore: 0.3,
      modelVersion: "calibration-v1",
      reasonText:
        latestBestWeight > 0
          ? "Calibration mode: start near your last logged working weight and adjust as needed."
          : "Calibration mode: enter the weights you perform today.",
    } satisfies RecommendationResult;
  }

  if (sorted.length < 2 || latestBestWeight <= 0) {
    return computeDeterministicRecommendation({
      lastWeight: latestBestWeight || 0,
      lastBestReps: latestBestReps || repTarget.low,
      targetLow: repTarget.low,
      targetHigh: repTarget.high,
      movementType: args.movementType,
      coachingStyle: args.coachingStyle,
      units: args.units,
      targetSets: args.defaultSets,
    });
  }

  const features: number[][] = [];
  const targets: number[] = [];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentBestWeight = current.sets.reduce((m, s) => Math.max(m, s.weight), 0);
    const currentBestReps = current.sets
      .filter((s) => s.weight === currentBestWeight)
      .reduce((m, s) => Math.max(m, s.reps), 0);
    const currentBestE1RM = current.sets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0);

    const rollingSessions = sorted.slice(Math.max(0, i - 2), i + 1);
    const movingE1RM =
      rollingSessions
        .map((session) =>
          session.sets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0),
        )
        .reduce((acc, v) => acc + v, 0) / rollingSessions.length;

    const daysSinceLast =
      (new Date(next.startedAt).getTime() - new Date(current.startedAt).getTime()) / (1000 * 60 * 60 * 24);

    const nextBestWeight = next.sets.reduce((m, s) => Math.max(m, s.weight), 0);
    if (!currentBestWeight || !nextBestWeight) continue;

    features.push(
      buildFeatureVector({
        previousWeight: currentBestWeight,
        achievedReps: currentBestReps,
        movingE1RM: Math.max(movingE1RM, currentBestE1RM),
        daysSinceLast,
        coachingStyle: args.coachingStyle,
        goal: args.goal,
      }),
    );
    targets.push(nextBestWeight);
  }

  const latestMovingE1RM =
    sorted
      .slice(Math.max(0, sorted.length - 3))
      .map((session) => session.sets.reduce((m, s) => Math.max(m, estimated1RM(s.weight, s.reps)), 0))
      .reduce((acc, v) => acc + v, 0) / Math.min(3, sorted.length);

  if (features.length >= 6) {
    const model = fitLinearRegression(features, targets);
    if (model && model.r2 > 0.08) {
      const daysSinceLast = latest
        ? (Date.now() - new Date(latest.startedAt).getTime()) / (1000 * 60 * 60 * 24)
        : 3;
      const rawPrediction = dot(
        buildFeatureVector({
          previousWeight: latestBestWeight,
          achievedReps: latestBestReps || repTarget.low,
          movingE1RM: latestMovingE1RM || estimated1RM(latestBestWeight, latestBestReps || repTarget.low),
          daysSinceLast,
          coachingStyle: args.coachingStyle,
          goal: args.goal,
        }),
        model.weights,
      );

      const styleAdj = styleFactor(args.coachingStyle);
      const adjusted = rawPrediction * (0.95 + 0.05 * styleAdj);

      const caps = args.units === "LB" ? WEIGHT_CAPS_LB : WEIGHT_CAPS_KG;
      const cap = args.movementType === "COMPOUND" ? caps.lower : caps.upper;
      const bounded = Math.max(latestBestWeight - cap, Math.min(latestBestWeight + cap, adjusted));

      return {
        recommendedWeight: roundWeight(Math.max(0, bounded), args.units),
        recommendedRepLow: repTarget.low,
        recommendedRepHigh: repTarget.high,
        recommendedSets: args.defaultSets,
        confidenceScore: Math.max(0.5, Math.min(0.95, 0.55 + features.length / 30 + model.r2 / 2)),
        modelVersion: "ml-linear-v1",
        reasonText: `ML model used ${features.length} prior sessions and recent trend to set your next working weight.`,
      } satisfies RecommendationResult;
    }
  }

  return computeDeterministicRecommendation({
    lastWeight: latestBestWeight,
    lastBestReps: latestBestReps,
    targetLow: repTarget.low,
    targetHigh: repTarget.high,
    movementType: args.movementType,
    coachingStyle: args.coachingStyle,
    units: args.units,
    targetSets: args.defaultSets,
  });
}
