import { describe, expect, it } from "vitest";
import { buildRecommendation, computeDeterministicRecommendation } from "@/lib/recommendation";

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
