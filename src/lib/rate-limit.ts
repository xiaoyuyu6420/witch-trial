import type { NextRequest } from "next/server";

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

function getClientId(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function prune(now: number) {
  if (buckets.size <= 10_000) return;
  const cutoff = now - 60 * 60 * 1000;
  for (const [key, b] of buckets) {
    if (b.lastRefill < cutoff) buckets.delete(key);
  }
}

export function rateLimit(
  req: NextRequest,
  opts: { id: string; capacity: number; refillPerSec: number }
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  prune(now);

  const ip = getClientId(req);
  const key = `${opts.id}:${ip}`;
  const existing = buckets.get(key);

  let tokens: number;
  if (!existing) {
    tokens = opts.capacity;
  } else {
    const elapsedSec = (now - existing.lastRefill) / 1000;
    tokens = Math.min(opts.capacity, existing.tokens + elapsedSec * opts.refillPerSec);
  }

  if (tokens >= 1) {
    buckets.set(key, { tokens: tokens - 1, lastRefill: now });
    return { ok: true };
  }

  buckets.set(key, { tokens, lastRefill: now });
  const retryAfter = Math.ceil((1 - tokens) / opts.refillPerSec);
  return { ok: false, retryAfter };
}
