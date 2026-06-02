import { NextRequest, NextResponse } from "next/server";
import { match, type MatchInput } from "@/lib/match";
import { matchRequestSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { id: "match", capacity: 20, refillPerSec: 0.5 });
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

  const parsed = matchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { answers, gateValue: clientGateValue, triggerFired: clientTriggerFired } = parsed.data;

  // Re-derive dim/score/gate/trigger from DB — never trust the client.
  const optionIds = Array.from(new Set(answers.map((a) => a.optionId)));
  const options = await db.option.findMany({
    where: { id: { in: optionIds } },
    include: { question: { select: { id: true, dim: true, type: true } } },
  });
  const optionMap = new Map(options.map((o) => [o.id, o]));
  const validAnswers: typeof answers = [];

  const dimScores: Record<string, number> = {};
  let gateValue: MatchInput["gateValue"] | undefined;
  let triggerFired: string | undefined;

  for (const a of answers) {
    const opt = optionMap.get(a.optionId);
    if (!opt || opt.questionId !== a.questionId) continue;
    validAnswers.push(a);

    const qType = opt.question.type;
    if (qType === "gate") {
      const v = opt.value;
      if (v === "destroy" || v === "endure" || v === "normal" || v === "normal_alt") {
        gateValue = v;
      }
      continue;
    }
    if (qType === "trigger") {
      if (opt.trigger) triggerFired = opt.trigger;
      continue;
    }

    const dim = opt.question.dim;
    if (!dim || dim === "GATE" || dim === "TRIGGER") continue;
    dimScores[dim] = (dimScores[dim] ?? 0) + (opt.score ?? 0);
  }

  if (validAnswers.length !== answers.length) {
    return NextResponse.json(
      { error: "Invalid answers" },
      { status: 400 }
    );
  }

  // If the client claimed a gate/trigger but the DB didn't confirm it, drop it silently.
  // (Keeps the API forgiving while preventing forged hidden-character results.)
  void clientGateValue;
  void clientTriggerFired;

  const input: MatchInput = { dimScores, gateValue, triggerFired };
  const dbTypes = await db.personalityType.findMany();
  const result = match(input, dbTypes);

  return NextResponse.json(result);
}
