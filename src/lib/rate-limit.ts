// In-memory rate limiter. Effective for single-process deployments.
// For multi-instance/serverless, swap the store for Redis or an edge KV store.

const store = new Map<string, number[]>();

export function rateLimit(
  key: string,
  opts: { maxRequests: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < opts.windowMs);

  if (timestamps.length >= opts.maxRequests) {
    const oldest = timestamps[0];
    return { allowed: false, retryAfterMs: opts.windowMs - (now - oldest) };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
