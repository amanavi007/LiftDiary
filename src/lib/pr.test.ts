import { describe, expect, it } from "vitest";
import { estimated1RM, summarizeExercisePRs } from "@/lib/pr";

describe("PR math", () => {
  it("computes Epley estimated 1RM", () => {
    expect(estimated1RM(100, 10)).toBeCloseTo(133.33, 1);
  });

  it("summarizes exercise PRs", () => {
    const result = summarizeExercisePRs([
      {
        id: "1",
        sessionId: "s",
        exerciseId: "e",
        setIndex: 1,
        weight: 100,
        reps: 8,
        timestamp: new Date(),
        isFailed: false,
      },
      {
        id: "2",
        sessionId: "s",
        exerciseId: "e",
        setIndex: 2,
        weight: 110,
        reps: 6,
        timestamp: new Date(),
        isFailed: false,
      },
    ] as never);

    expect(result.bestWeight).toBe(110);
    expect(result.bestRepsAtBestWeight).toBe(6);
    expect(result.bestEstimated1RM).toBeGreaterThan(130);
    expect(result.maxVolumeSet).toBe(800);
  });
});
