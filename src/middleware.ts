import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const auth = req.headers.get("x-admin-password");
    // Forward to route handlers — they'll validate against their own env access
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/admin/:path*" };
