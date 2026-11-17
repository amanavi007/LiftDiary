import { describe, expect, it } from "vitest";
import { computeReadiness } from "@/lib/readiness";

const DAY = 86_400_000;
const now = new Date("2026-11-17T12:00:00Z");

type S = Parameters<typeof computeReadiness>[0]["sessions"][number];

function session(daysAgo: number, opts: Partial<S> & { sets?: S["sets"] } = {}): S {
  const ended = new Date(now.getTime() - daysAgo * DAY);
  return {
    startedAt: new Date(ended.getTime() - 3_600_000),
    endedAt: ended,
    routineDayId: "pull",
    sets: opts.sets ?? [
      { weight: 100, reps: 10, isFailed: false },
      { weight: 100, reps: 10, isFailed: false },
    ],
    ...opts,
  };
}

const run = (sessions: S[]) => computeReadiness({ now, targetDayId: "pull", sessions });

describe("computeReadiness", () => {
  it("returns a neutral state with no completed sessions", () => {
    const r = run([]);
    expect(r.score).toBeNull();
    expect(r.label).toBe("Getting started");
  });

  it("ignores sessions that never ended", () => {
    const r = run([session(1, { endedAt: null })]);
    expect(r.score).toBeNull();
  });

  it("is Good to push after 3 days of rest with no failed sets", () => {
    const r = run([session(3)]);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.label).toBe("Good to push");
  });

  it("scores lower right after a session than after 3 days of rest", () => {
    expect(run([session(0.2)]).score!).toBeLessThan(run([session(3)]).score!);
  });

  it("scores lower when half of the last session's sets failed", () => {
    const failed = session(3, {
      sets: [
        { weight: 100, reps: 10, isFailed: true },
        { weight: 100, reps: 10, isFailed: false },
      ],
    });
    expect(run([failed]).score!).toBeLessThan(run([session(3)]).score!);
  });

  it("scores lower when this week's volume spikes above the prior 3-week average", () => {
    const big = { weight: 200, reps: 10, isFailed: false };
    const steady = [session(10), session(17), session(24)];
    const spike = [session(3, { sets: [big, big, big, big, big, big] }), ...steady];
    const flat = [session(3), ...steady];
    expect(run(spike).score!).toBeLessThan(run(flat).score!);
  });

  it("always returns an integer from 0 to 100 and a one-sentence note", () => {
    const worst = run([
      session(0, { sets: [{ weight: 100, reps: 10, isFailed: true }] }),
    ]);
    expect(Number.isInteger(worst.score)).toBe(true);
    expect(worst.score!).toBeGreaterThanOrEqual(0);
    expect(worst.score!).toBeLessThanOrEqual(100);
    expect(worst.note.length).toBeGreaterThan(0);
  });

  it("maps low scores to Take it easy", () => {
    const r = run([session(0, { sets: [{ weight: 100, reps: 10, isFailed: true }] })]);
    expect(r.label).toBe("Take it easy");
  });

  it("copes with a last session that has no sets", () => {
    const r = run([session(3, { sets: [] })]);
    expect(Number.isNaN(r.score)).toBe(false);
  });

  it("ignores finished sessions with nothing logged", () => {
    const r = run([session(1, { sets: [] }), session(0.2, { sets: [] })]);
    expect(r.score).toBeNull();
    expect(r.label).toBe("Getting started");
  });
});
