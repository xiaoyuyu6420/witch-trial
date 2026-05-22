import { NextRequest, NextResponse } from "next/server";
import { resultsRequestSchema } from "@/lib/schemas";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = resultsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    sessionId, resultCode, similarity, userVector, top3, borderType,
    answers, gateValue, triggerFired,
    userAgent, screenRes, language, timezone,
    startedAt, completedAt, duration,
  } = parsed.data;

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
      ipAddress: null,
      screenRes: screenRes ?? null,
      language: language ?? null,
      timezone: timezone ?? null,
      startedAt: startedAt ? new Date(startedAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
      duration: duration ?? null,
      answers: {
        create: (answers ?? []).map((a) => ({
          questionId: a.questionId,
          optionId: a.optionId,
        })),
      },
    },
  });

  const totalParticipants = await db.testRecord.count();
  const typeCount = await db.testRecord.count({ where: { resultCode } });
  const typePercentage = totalParticipants > 0 ? Math.round((typeCount / totalParticipants) * 1000) / 10 : 0;

  // Rank within same-type records by similarity (higher = better). Ties resolved by older recordId first.
  const betterCount = await db.testRecord.count({
    where: {
      resultCode,
      OR: [
        { similarity: { gt: similarity } },
        { similarity, id: { lt: record.id } },
      ],
    },
  });
  const rank = betterCount + 1;

  return NextResponse.json({
    recordId: record.id,
    rank,
    totalParticipants,
    typeCount,
    typePercentage,
  });
}
