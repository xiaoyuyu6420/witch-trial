import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const auth = req.headers.get("x-admin-password");
    const expected = process.env.ADMIN_PASSWORD;
    if (!auth || !expected || auth !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/admin/:path*" };
