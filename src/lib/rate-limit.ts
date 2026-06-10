import type { NextRequest } from "next/server";

type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

/**
 * Determines whether to trust x-forwarded-for based on TRUSTED_PROXY env var.
 *
 * Values:
 *   "all"    - (default) Trust x-forwarded-for. Use this when the app is behind
 *              a reverse proxy (nginx, Caddy, cloud load balancer, etc.) that
 *              sets the header on every request.
 *   "none"   - Ignore x-forwarded-for entirely. Use this when the app is
 *              exposed directly to the internet without a reverse proxy.
 *              Falls back to x-real-ip, then "unknown".
 *
 * Next.js Route Handlers do not expose a server-side client IP (req.ip),
 * so we cannot verify whether the request actually came from a trusted proxy.
 * The TRUSTED_PROXY env var acts as an explicit declaration of trust.
 *
 * Security note: x-real-ip can also be spoofed by clients, but it is rarely
 * present in normal browser traffic (proxies must explicitly add it), so it
 * serves as a weaker but still useful fallback.
 */
export function isProxyTrusted(): boolean {
  const value = process.env.TRUSTED_PROXY?.trim().toLowerCase() ?? "all";
  return value !== "none";
}

function getClientId(req: NextRequest): string {
  if (isProxyTrusted()) {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }

  return req.headers.get("x-real-ip") ?? "unknown";
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
