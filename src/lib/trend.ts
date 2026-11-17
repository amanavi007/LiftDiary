export type LiftTrend = "up" | "hold" | "down" | "new";

/** Compares a lift's weight today against the top weight from the last session. */
export function liftTrend(todayWeight: number, lastWeight: number | null): LiftTrend {
  if (lastWeight === null || lastWeight <= 0) return "new";
  if (todayWeight > lastWeight) return "up";
  if (todayWeight < lastWeight) return "down";
  return "hold";
}
