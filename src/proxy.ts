import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const adminAttempts = new Map<string, { count: number; lastAttempt: number }>();
const ADMIN_RATE_LIMIT = 10;
const ADMIN_RATE_WINDOW = 60 * 1000;

function isAdminRateLimited(ip: string): boolean {
  const entry = adminAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.lastAttempt > ADMIN_RATE_WINDOW) {
    adminAttempts.delete(ip);
    return false;
  }
  return entry.count >= ADMIN_RATE_LIMIT;
}

function recordAdminAttempt(ip: string) {
  const entry = adminAttempts.get(ip);
  if (!entry || Date.now() - entry.lastAttempt > ADMIN_RATE_WINDOW) {
    adminAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  } else {
    entry.count++;
    entry.lastAttempt = Date.now();
  }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const ip = getClientIp(req);

    if (isAdminRateLimited(ip)) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    const auth = req.headers.get("x-admin-password");
    const expected = process.env.ADMIN_PASSWORD;
    if (!auth || !expected || !safeEqual(auth, expected)) {
      recordAdminAttempt(ip);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/admin/:path*" };
