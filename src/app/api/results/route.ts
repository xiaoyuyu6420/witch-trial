import { NextRequest, NextResponse } from "next/server";
import { resultsRequestSchema } from "@/lib/schemas";
import { match } from "@/lib/match";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { processAnswers } from "@/lib/answer-processor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { id: "results", capacity: 10, refillPerSec: 0.2 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

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
    sessionId, answers,
    userAgent, screenRes, language, timezone,
    startedAt, completedAt, duration,
  } = parsed.data;

  if (!answers || answers.length === 0) {
    return NextResponse.json(
      { error: "answers required" },
      { status: 400 }
    );
  }

  const optionIds = Array.from(new Set(answers.map((a) => a.optionId)));
  const options = await db.option.findMany({
    where: { id: { in: optionIds } },
    include: { question: { select: { id: true, dim: true, type: true } } },
  });

  const { dimScores, gateValue, triggerFired, validAnswers } = processAnswers(answers, options);

  if (validAnswers.length !== answers.length) {
    return NextResponse.json(
      { error: "Invalid answers" },
      { status: 400 }
    );
  }

  const result = match({ dimScores, gateValue, triggerFired }, await db.personalityType.findMany());

  const record = await db.testRecord.create({
    data: {
      sessionId,
      resultCode: result.code,
      similarity: result.similarity,
      userVector: result.userVector,
      top3: JSON.stringify(result.top3),
      borderType: result.borderType,
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
        create: validAnswers.map((a) => ({
          questionId: a.questionId,
          optionId: a.optionId,
        })),
      },
    },
  });

  const totalParticipants = await db.testRecord.count();
  const typeCount = await db.testRecord.count({ where: { resultCode: result.code } });
  const typePercentage = totalParticipants > 0 ? Math.round((typeCount / totalParticipants) * 1000) / 10 : 0;

  const betterCount = await db.testRecord.count({
    where: {
      resultCode: result.code,
      OR: [
        { similarity: { gt: result.similarity } },
        { similarity: result.similarity, id: { lt: record.id } },
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
