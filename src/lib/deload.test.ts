import { describe, expect, it } from "vitest";
import { shouldSuggestDeload } from "@/lib/deload";

const day = 86_400_000;
const session = (daysAgo: number, failed: number, total: number) => ({
  startedAt: new Date(Date.UTC(2026, 10, 17) - daysAgo * day),
  endedAt: new Date(Date.UTC(2026, 10, 17) - daysAgo * day + 3_600_000),
  routineDayId: "d",
  sets: Array.from({ length: total }, (_, i) => ({ weight: 100, reps: 8, isFailed: i < failed })),
});

describe("shouldSuggestDeload", () => {
  it("is true when readiness is low and 2 of the last 3 sessions had many failed sets", () => {
    expect(shouldSuggestDeload([session(1, 2, 6), session(3, 3, 6), session(5, 0, 6)], 30)).toBe(true);
  });
  it("is false when readiness is healthy", () => {
    expect(shouldSuggestDeload([session(1, 2, 6), session(3, 3, 6)], 80)).toBe(false);
  });
  it("is false when only one recent session had many failed sets", () => {
    expect(shouldSuggestDeload([session(1, 3, 6), session(3, 0, 6), session(5, 0, 6)], 30)).toBe(false);
  });
  it("is false with no score yet or no sessions", () => {
    expect(shouldSuggestDeload([], null)).toBe(false);
    expect(shouldSuggestDeload([session(1, 3, 6), session(3, 3, 6)], null)).toBe(false);
  });
  it("ignores sessions with no sets and unfinished sessions", () => {
    const empty = { ...session(1, 0, 0) };
    const unfinished = { ...session(2, 6, 6), endedAt: null };
    expect(shouldSuggestDeload([empty, unfinished], 20)).toBe(false);
  });
});
