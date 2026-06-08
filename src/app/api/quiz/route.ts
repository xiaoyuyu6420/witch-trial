import { NextResponse } from "next/server";
import { DIMENSIONS, WEIGHTS } from "@/data/quiz-content";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [questions, types] = await Promise.all([
    db.question.findMany({ orderBy: { order: "asc" }, include: { options: true } }),
    db.personalityType.findMany({ orderBy: { id: "asc" } }),
  ]);

  return NextResponse.json({
    dimensions: DIMENSIONS,
    weights: WEIGHTS,
    types,
    questions: questions.map((q) => ({
      id: q.id,
      dim: q.dim,
      text: q.text,
      order: q.order,
      type: q.type,
      meta: q.meta || "",
      translations: q.translations,
      options: q.options.map((o) => (
        q.type === "gate"
          ? { id: o.id, label: o.label, value: o.value ?? null }
          : { id: o.id, label: o.label }
      )),
    })),
  });
}
