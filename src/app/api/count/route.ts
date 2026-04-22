import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Base offset so the count starts around 3000
const BASE_COUNT = 2974;

export async function GET() {
  try {
    const real = await db.testRecord.count();
    return NextResponse.json({ total: BASE_COUNT + real });
  } catch {
    return NextResponse.json({ total: BASE_COUNT });
  }
}
