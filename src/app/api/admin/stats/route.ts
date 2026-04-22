import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalParticipants, todayCount, avgResult, typeDistribution, gateDistribution, recentActivity] =
      await Promise.all([
        db.testRecord.count(),
        db.testRecord.count({ where: { createdAt: { gte: todayStart } } }),
        db.testRecord.aggregate({ _avg: { similarity: true } }),
        db.testRecord.groupBy({
          by: ["resultCode"],
          _count: true,
          orderBy: { _count: { resultCode: "desc" } },
        }),
        db.testRecord.groupBy({
          by: ["gateValue"],
          _count: true,
          where: { gateValue: { not: null } },
        }),
        db.testRecord.findMany({
          take: 20,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            sessionId: true,
            resultCode: true,
            similarity: true,
            ipAddress: true,
            duration: true,
            createdAt: true,
          },
        }),
      ]);

    const dailyTrends = await db.$queryRaw<
      { day: string; count: bigint }[]
    >`SELECT date(createdAt) as day, count(*) as count FROM TestRecord GROUP BY day ORDER BY day DESC LIMIT 30`;

    return NextResponse.json({
      totalParticipants,
      todayCount,
      avgSimilarity: avgResult._avg.similarity ?? 0,
      typeDistribution,
      gateDistribution,
      dailyTrends: dailyTrends.map((d) => ({ day: d.day, count: Number(d.count) })),
      recentActivity,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
