import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit } from "./rate-limit";
import type { NextRequest } from "next/server";

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return { headers: { get: (k: string) => headers[k] ?? null } } as unknown as NextRequest;
}

describe("rateLimit", () => {
  beforeEach(() => {
    process.env.TRUSTED_PROXY = "all";
  });

  it("allows requests within capacity", () => {
    const req = makeReq({ "x-forwarded-for": "1.2.3.4" });
    const result = rateLimit(req, { id: "test", capacity: 3, refillPerSec: 0 });
    expect(result.ok).toBe(true);
  });

  it("blocks requests when tokens exhausted", () => {
    const req = makeReq({ "x-forwarded-for": "1.2.3.4" });
    const opts = { id: "block-test", capacity: 2, refillPerSec: 0 };
    expect(rateLimit(req, opts).ok).toBe(true);
    expect(rateLimit(req, opts).ok).toBe(true);
    const result = rateLimit(req, opts);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("isolates different IPs", () => {
    const opts = { id: "iso-test", capacity: 1, refillPerSec: 0 };
    const req1 = makeReq({ "x-forwarded-for": "1.1.1.1" });
    const req2 = makeReq({ "x-forwarded-for": "2.2.2.2" });
    expect(rateLimit(req1, opts).ok).toBe(true);
    expect(rateLimit(req2, opts).ok).toBe(true);
  });

  it("falls back to x-real-ip when TRUSTED_PROXY=none", () => {
    process.env.TRUSTED_PROXY = "none";
    const req = makeReq({ "x-forwarded-for": "spoofed", "x-real-ip": "3.3.3.3" });
    const opts = { id: "proxy-test", capacity: 1, refillPerSec: 0 };
    expect(rateLimit(req, opts).ok).toBe(true);
    const req2 = makeReq({ "x-real-ip": "3.3.3.3" });
    expect(rateLimit(req2, opts).ok).toBe(false);
  });

  it("returns unknown when no IP headers present", () => {
    process.env.TRUSTED_PROXY = "none";
    const req = makeReq();
    const opts = { id: "no-ip-test", capacity: 1, refillPerSec: 0 };
    expect(rateLimit(req, opts).ok).toBe(true);
  });
});
