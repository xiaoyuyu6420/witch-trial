import { NextRequest, NextResponse } from "next/server";
import { match, type MatchInput } from "@/lib/match";
import { DIMENSIONS } from "@/data/quiz-content";
import type { DimCode } from "@/data/quiz-content";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { answers, gateValue, triggerFired } = body as {
    answers: { questionId: number; optionId: number; dim: string; score: number }[];
    gateValue?: string;
    triggerFired?: string;
  };

  // 聚合每维度分数
  const dimScores: Record<string, number> = {};
  for (const a of answers) {
    if (!a.dim || a.dim === "GATE" || a.dim === "TRIGGER") continue;
    dimScores[a.dim] = (dimScores[a.dim] ?? 0) + (a.score ?? 0);
  }

  const input: MatchInput = { dimScores, gateValue, triggerFired };
  const dbTypes = await db.personalityType.findMany();
  const result = match(input, dbTypes);

  return NextResponse.json(result);
}
