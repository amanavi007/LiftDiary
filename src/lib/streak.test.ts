import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/streak";

const now = new Date(2026, 10, 17, 12, 0); // Tue, local

const d = (day: number, h = 10) => new Date(2026, 10, day, h, 0);

describe("computeStreak", () => {
  it("is 0 with no sessions", () => {
    expect(computeStreak(now, [])).toBe(0);
  });
  it("counts consecutive days ending today", () => {
    expect(computeStreak(now, [d(17), d(16), d(15)])).toBe(3);
  });
  it("still counts when the latest session was yesterday", () => {
    expect(computeStreak(now, [d(16), d(15)])).toBe(2);
  });
  it("is 0 when the latest session was two or more days ago", () => {
    expect(computeStreak(now, [d(14), d(13)])).toBe(0);
  });
  it("counts two sessions on one day once", () => {
    expect(computeStreak(now, [d(17, 8), d(17, 18), d(16)])).toBe(2);
  });
  it("stops at the first gap", () => {
    expect(computeStreak(now, [d(17), d(16), d(14)])).toBe(2);
  });
});
