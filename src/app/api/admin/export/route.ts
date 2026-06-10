import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const records = await db.testRecord.findMany({
      orderBy: { createdAt: "desc" },
      include: { answers: true },
    });

    const headers = [
      "ID",
      "Session",
      "Type",
      "Similarity",
      "IP",
      "UserAgent",
      "ScreenRes",
      "Language",
      "Timezone",
      "Duration",
      "StartedAt",
      "CompletedAt",
      "CreatedAt",
    ];

    const escape = (v: unknown): string => {
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const rows = records.map((r) =>
      [
        r.id,
        r.sessionId,
        r.resultCode,
        r.similarity,
        r.ipAddress,
        r.userAgent,
        r.screenRes,
        r.language,
        r.timezone,
        r.duration,
        r.startedAt?.toISOString(),
        r.completedAt?.toISOString(),
        r.createdAt.toISOString(),
      ]
        .map(escape)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="test-records.csv"',
      },
    });
  } catch (e) {
    console.error(e);
    return apiError("Export failed", 500, e);
  }
}
