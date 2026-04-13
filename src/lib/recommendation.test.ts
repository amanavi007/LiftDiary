import { describe, expect, it } from "vitest";
import { buildRecommendation, computeDeterministicRecommendation } from "@/lib/recommendation";

/** Build a fake session with one set at a given weight and reps. */
function makeSession(id: string, daysAgo: number, weight: number, reps: number) {
  const ts = new Date(Date.now() - daysAgo * 86_400_000);
  return {
    id,
    userId: "u",
    routineDayId: "d",
    startedAt: ts,
    endedAt: ts,
    coachingStyleSnapshot: "BALANCED" as const,
    goalSnapshot: "HYPERTROPHY" as const,
    unitsSnapshot: "LB" as const,
    sets: [
      {
        id: `${id}-set`,
        sessionId: id,
        exerciseId: "e",
        setIndex: 1,
        weight,
        reps,
        timestamp: ts,
        isFailed: false,
      },
    ],
  };
}

describe("recommendation engine", () => {
  it("uses deterministic safety caps", () => {
    const rec = computeDeterministicRecommendation({
      lastWeight: 300,
      lastBestReps: 10,
      targetLow: 8,
      targetHigh: 12,
      movementType: "ISOLATION",
      coachingStyle: "AGGRESSIVE",
      units: "LB",
      targetSets: 3,
    });

    expect(rec.recommendedWeight).toBeLessThanOrEqual(310);
  });

  it("returns calibration recommendation before completion", () => {
    const rec = buildRecommendation({
      sessions: [],
      calibrationComplete: false,
      calibrationLength: 7,
      workoutsCompleted: 2,
      goal: "HYPERTROPHY",
      coachingStyle: "BALANCED",
      movementType: "COMPOUND",
      units: "LB",
      defaultSets: 3,
    });

    expect(rec.modelVersion).toBe("calibration-v1");
    expect(rec.confidenceScore).toBeLessThan(0.5);
  });

  it("ML model recommends progression when user consistently exceeds rep target", () => {
    // Simulate 8 sessions where the user always hits 13 reps (above 8–12 target)
    // at steadily increasing weights. The ML model should recommend a weight
    // above the last session's weight — not the same or lower.
    const sessions = [
      makeSession("s1", 56, 100, 13),
      makeSession("s2", 49, 102.5, 13),
      makeSession("s3", 42, 105, 13),
      makeSession("s4", 35, 107.5, 13),
      makeSession("s5", 28, 110, 13),
      makeSession("s6", 21, 112.5, 13),
      makeSession("s7", 14, 115, 13),
      makeSession("s8", 7, 117.5, 13),
    ];

    const rec = buildRecommendation({
      sessions: sessions as never,
      calibrationComplete: true,
      calibrationLength: 7,
      workoutsCompleted: 8,
      goal: "HYPERTROPHY",
      coachingStyle: "BALANCED",
      movementType: "COMPOUND",
      units: "LB",
      defaultSets: 3,
    });

    // Should have graduated to the ML model
    expect(rec.modelVersion).toBe("ml-linear-v1");
    // Should recommend more weight than last session (117.5 lbs)
    expect(rec.recommendedWeight).toBeGreaterThan(117.5);
    // Confidence should be meaningfully above baseline (0.55)
    expect(rec.confidenceScore).toBeGreaterThan(0.6);
  });

  it("ML model recommends deload when user consistently misses rep target", () => {
    // 8 sessions where user only gets 6 reps (below 8 low-end of 8–12)
    const sessions = [
      makeSession("s1", 56, 140, 6),
      makeSession("s2", 49, 140, 6),
      makeSession("s3", 42, 140, 6),
      makeSession("s4", 35, 140, 6),
      makeSession("s5", 28, 140, 6),
      makeSession("s6", 21, 140, 6),
      makeSession("s7", 14, 140, 6),
      makeSession("s8", 7, 140, 6),
    ];

    const rec = buildRecommendation({
      sessions: sessions as never,
      calibrationComplete: true,
      calibrationLength: 7,
      workoutsCompleted: 8,
      goal: "HYPERTROPHY",
      coachingStyle: "BALANCED",
      movementType: "COMPOUND",
      units: "LB",
      defaultSets: 3,
    });

    // Deterministic or ML — either way should not push weight higher
    expect(rec.recommendedWeight).toBeLessThanOrEqual(140);
  });

  it("falls back to deterministic model for sparse history", () => {
    const now = Date.now();
    const rec = buildRecommendation({
      sessions: [
        {
          id: "s1",
          userId: "u",
          routineDayId: "d",
          startedAt: new Date(now - 86400000 * 2),
          endedAt: new Date(now - 86400000 * 2),
          coachingStyleSnapshot: "BALANCED",
          goalSnapshot: "HYPERTROPHY",
          unitsSnapshot: "LB",
          sets: [
            {
              id: "set1",
              sessionId: "s1",
              exerciseId: "e",
              setIndex: 1,
              weight: 100,
              reps: 13,
              timestamp: new Date(now - 86400000 * 2),
              isFailed: false,
            },
          ],
        },
      ] as never,
      calibrationComplete: true,
      calibrationLength: 7,
      workoutsCompleted: 10,
      goal: "HYPERTROPHY",
      coachingStyle: "BALANCED",
      movementType: "COMPOUND",
      units: "LB",
      defaultSets: 3,
    });

    expect(rec.modelVersion).toBe("deterministic-v1");
    expect(rec.recommendedWeight).toBeGreaterThanOrEqual(100);
  });
});
