import { describe, expect, it } from "vitest";
import { secondsRemaining } from "@/lib/rest-timer";

describe("secondsRemaining", () => {
  it("rounds a partial second up", () => {
    expect(secondsRemaining(10_000, 7_500)).toBe(3);
  });
  it("is the whole duration when the clock has not moved", () => {
    expect(secondsRemaining(90_000, 0)).toBe(90);
  });
  it("is 0 once the end time has passed, never negative", () => {
    expect(secondsRemaining(10_000, 10_000)).toBe(0);
    expect(secondsRemaining(10_000, 99_000)).toBe(0);
  });
  it("stays correct after a long gap such as a sleeping phone", () => {
    // 90s rest started at t=0; the tab wakes at t=60s
    expect(secondsRemaining(90_000, 60_000)).toBe(30);
  });
});
