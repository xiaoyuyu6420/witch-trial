import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "";

    const where: Record<string, unknown> = {};
    if (type) where.resultCode = type;
    if (search) {
      where.OR = [
        { sessionId: { contains: search } },
        { resultCode: { contains: search } },
        { ipAddress: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      db.testRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          sessionId: true,
          resultCode: true,
          similarity: true,
          userVector: true,
          userAgent: true,
          ipAddress: true,
          screenRes: true,
          language: true,
          timezone: true,
          duration: true,
          createdAt: true,
        },
      }),
      db.testRecord.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
