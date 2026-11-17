/** Whole seconds left until `endsAtMs`, rounded up, never negative. Based on timestamps so it survives sleep/backgrounding. */
export function secondsRemaining(endsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}
