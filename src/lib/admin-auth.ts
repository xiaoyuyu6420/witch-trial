import { NextRequest, NextResponse } from "next/server";

export function checkAdminAuth(req: NextRequest): NextResponse | null {
  const pw = process.env.ADMIN_PASSWORD;
  const auth = req.headers.get("x-admin-password");
  if (!pw || auth !== pw) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
