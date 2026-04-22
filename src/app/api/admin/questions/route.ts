import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const questions = await db.question.findMany({
      orderBy: { order: "asc" },
      include: { options: true },
    });
    return NextResponse.json(questions);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const questions = (await req.json()) as {
      id?: number;
      dim: string;
      text: string;
      order: number;
      type: string;
      meta: string;
      options: { id?: number; label: string; score: number; value?: string; trigger?: string }[];
    }[];

    await db.$transaction(
      questions.map((q) =>
        db.question.upsert({
          where: { id: q.id ?? -1 },
          update: { dim: q.dim, text: q.text, order: q.order, type: q.type, meta: q.meta },
          create: {
            dim: q.dim,
            text: q.text,
            order: q.order,
            type: q.type,
            meta: q.meta,
            options: {
              create: q.options.map((o) => ({
                label: o.label,
                score: o.score,
                value: o.value,
                trigger: o.trigger,
              })),
            },
          },
        })
      )
    );

    // Upsert options for existing questions
    for (const q of questions) {
      if (!q.id) continue;
      for (const o of q.options) {
        if (o.id) {
          await db.option.upsert({
            where: { id: o.id },
            update: { label: o.label, score: o.score, value: o.value, trigger: o.trigger },
            create: {
              questionId: q.id,
              label: o.label,
              score: o.score,
              value: o.value,
              trigger: o.trigger,
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
