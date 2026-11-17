import { describe, expect, it } from "vitest";
import { weekStrip } from "@/lib/week";

// 2026-11-17 is a Tuesday. Dates are built in local time on purpose.
const tuesdayNoon = new Date(2026, 10, 17, 12, 0);

describe("weekStrip", () => {
  it("returns seven Monday-first days and flags today", () => {
    const strip = weekStrip(tuesdayNoon, []);
    expect(strip.map((d) => d.label)).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(strip.map((d) => d.isToday)).toEqual([false, true, false, false, false, false, false]);
    expect(strip.every((d) => !d.trained)).toBe(true);
  });

  it("marks a session at 23:30 local on Monday as Monday, not Tuesday", () => {
    const strip = weekStrip(tuesdayNoon, [new Date(2026, 10, 16, 23, 30)]);
    expect(strip[0].trained).toBe(true);
    expect(strip[1].trained).toBe(false);
  });

  it("ignores sessions from other weeks", () => {
    const strip = weekStrip(tuesdayNoon, [new Date(2026, 10, 15, 10, 0), new Date(2026, 10, 23, 10, 0)]);
    expect(strip.every((d) => !d.trained)).toBe(true);
  });

  it("treats Sunday as the last day of the week", () => {
    const sunday = new Date(2026, 10, 22, 9, 0);
    const strip = weekStrip(sunday, [sunday]);
    expect(strip[6]).toMatchObject({ trained: true, isToday: true });
  });
});
