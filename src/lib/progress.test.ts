import { describe, expect, it } from "vitest";
import { sessionBestSeries } from "@/lib/progress";

const set = (sessionId: string, date: string, weight: number, reps: number, isFailed = false) => ({
  sessionId,
  date,
  weight,
  reps,
  isFailed,
});

describe("sessionBestSeries", () => {
  it("returns one point per session using the best estimated 1RM", () => {
    const series = sessionBestSeries([
      set("a", "2026-11-01", 100, 10),
      set("a", "2026-11-01", 110, 5),
      set("b", "2026-11-08", 120, 5),
    ]);
    expect(series).toHaveLength(2);
    expect(series[0].date).toBe("2026-11-01");
    // best of 100x10 (133.3) and 110x5 (128.3)
    expect(series[0].e1rm).toBeCloseTo(133.3, 1);
    expect(series[1].e1rm).toBeCloseTo(140, 1);
  });

  it("ignores failed sets", () => {
    const series = sessionBestSeries([set("a", "2026-11-01", 200, 10, true), set("a", "2026-11-01", 100, 10)]);
    expect(series).toEqual([{ date: "2026-11-01", e1rm: 133.3 }]);
  });

  it("skips sessions with only failed sets", () => {
    expect(sessionBestSeries([set("a", "2026-11-01", 100, 10, true)])).toEqual([]);
  });

  it("returns points in date order and handles empty input", () => {
    expect(sessionBestSeries([])).toEqual([]);
    const series = sessionBestSeries([set("b", "2026-11-08", 120, 5), set("a", "2026-11-01", 100, 5)]);
    expect(series.map((p) => p.date)).toEqual(["2026-11-01", "2026-11-08"]);
  });

  it("keeps a bodyweight lift (weight 0) as a flat zero rather than dropping it", () => {
    expect(sessionBestSeries([set("a", "2026-11-01", 0, 10)])).toEqual([{ date: "2026-11-01", e1rm: 0 }]);
  });
});
