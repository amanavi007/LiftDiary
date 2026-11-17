import { describe, expect, it } from "vitest";
import { calcPlates, formatSeconds, getNextSetSuggestion, roundToUnit } from "@/lib/workout-helpers";

const exercise = (over: Partial<Parameters<typeof getNextSetSuggestion>[0]> = {}) => ({
  targetRepRangeLow: 8,
  targetRepRangeHigh: 12,
  recommendation: { recommendedWeight: 135, recommendedRepHigh: 12 },
  loggedSets: [],
  ...over,
});

describe("roundToUnit", () => {
  it("rounds to the nearest 2.5 lb", () => expect(roundToUnit(137, "LB")).toBe(137.5));
  it("rounds to the nearest 1.25 kg", () => expect(roundToUnit(61, "KG")).toBe(61.25));
  it("returns 0 for zero or negative", () => {
    expect(roundToUnit(0, "LB")).toBe(0);
    expect(roundToUnit(-5, "LB")).toBe(0);
  });
});

describe("calcPlates", () => {
  it("is empty for the bare bar", () => expect(calcPlates(45, "LB")).toEqual([]));
  it("loads one 45 per side for 135 lb", () => expect(calcPlates(135, "LB")).toEqual([45]));
  it("loads two 45s per side for 225 lb", () => expect(calcPlates(225, "LB")).toEqual([45, 45]));
  it("uses small plates for odd loads", () => expect(calcPlates(100, "LB")).toEqual([25, 2.5]));
  it("uses a 20 kg bar for kilograms", () => expect(calcPlates(60, "KG")).toEqual([20]));
});

describe("getNextSetSuggestion", () => {
  it("uses the recommended weight and top rep target before any set", () => {
    expect(getNextSetSuggestion(exercise(), "LB")).toEqual({ weight: 135, reps: 12 });
  });
  it("drops weight after a failed set", () => {
    const e = exercise({ loggedSets: [{ setIndex: 1, weight: 135, reps: 4, isFailed: true }] });
    expect(getNextSetSuggestion(e, "LB").weight).toBe(132.5);
  });
  it("holds weight when reps land in range", () => {
    const e = exercise({ loggedSets: [{ setIndex: 1, weight: 135, reps: 10, isFailed: false }] });
    expect(getNextSetSuggestion(e, "LB").weight).toBe(135);
  });
  it("adds weight when reps exceed the range", () => {
    const e = exercise({ loggedSets: [{ setIndex: 1, weight: 135, reps: 14, isFailed: false }] });
    expect(getNextSetSuggestion(e, "LB").weight).toBe(137.5);
  });
});

describe("formatSeconds", () => {
  it("formats as m:ss", () => {
    expect(formatSeconds(72)).toBe("1:12");
    expect(formatSeconds(5)).toBe("0:05");
  });
});
