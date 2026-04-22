import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    sessionId, resultCode, similarity, userVector, top3, borderType,
    answers, gateValue, triggerFired,
    userAgent, screenRes, language, timezone,
    startedAt, completedAt, duration,
  } = body;

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  const record = await db.testRecord.create({
    data: {
      sessionId,
      resultCode,
      similarity,
      userVector,
      top3: JSON.stringify(top3),
      borderType: borderType ?? false,
      gateValue: gateValue ?? null,
      triggerFired: triggerFired ?? null,
      userAgent: userAgent ?? null,
      ipAddress,
      screenRes: screenRes ?? null,
      language: language ?? null,
      timezone: timezone ?? null,
      startedAt: startedAt ? new Date(startedAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
      duration: duration ?? null,
      answers: {
        create: (answers ?? []).map((a: { questionId: number; optionId: number }) => ({
          questionId: a.questionId,
          optionId: a.optionId,
        })),
      },
    },
  });

  const totalParticipants = await db.testRecord.count();
  const typeRows = await db.testRecord.groupBy({ by: ["resultCode"], _count: true });
  const typeCount = typeRows.find((r: { resultCode: string; _count: number }) => r.resultCode === resultCode)?._count ?? 0;
  const typePercentage = totalParticipants > 0 ? Math.round((typeCount / totalParticipants) * 1000) / 10 : 0;

  const sameTypeRecords = await db.testRecord.findMany({
    where: { resultCode },
    orderBy: { similarity: "desc" },
    select: { id: true },
  });
  const rank = sameTypeRecords.findIndex((r: { id: number }) => r.id === record.id) + 1;

  // Look up personality name for the message
  const personality = await db.personalityType.findUnique({ where: { code: resultCode }, select: { name: true } });
  const displayName = personality?.name ?? resultCode;

  return NextResponse.json({
    recordId: record.id,
    rank,
    totalParticipants,
    typeCount,
    typePercentage,
    message: `你是第 ${typeCount} 位被判定为「${displayName}」的被审判者，全球只有 ${typePercentage}% 的人和你一样`,
  });
}
