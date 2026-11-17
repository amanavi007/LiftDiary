import { describe, expect, it } from "vitest";
import { liftTrend } from "@/lib/trend";

describe("liftTrend", () => {
  it("is up when today's weight is higher than last time", () => {
    expect(liftTrend(135, 130)).toBe("up");
  });
  it("is hold when the weight is unchanged", () => {
    expect(liftTrend(130, 130)).toBe("hold");
  });
  it("is down when today's weight is lower", () => {
    expect(liftTrend(125, 130)).toBe("down");
  });
  it("is new when there is no previous weight", () => {
    expect(liftTrend(135, null)).toBe("new");
  });
  it("treats a previous weight of 0 as new", () => {
    expect(liftTrend(135, 0)).toBe("new");
  });
});
