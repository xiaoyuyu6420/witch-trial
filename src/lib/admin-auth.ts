import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function checkAdminAuth(req: NextRequest): NextResponse | null {
  const pw = process.env.ADMIN_PASSWORD;
  const auth = req.headers.get("x-admin-password");
  if (!pw || !auth || !safeEqual(auth, pw)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
