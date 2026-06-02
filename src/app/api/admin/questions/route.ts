import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";
import { adminQuestionBulkSchema } from "@/lib/schemas";

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
    const parsed = adminQuestionBulkSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const questions = parsed.data;

    await db.$transaction(async (tx) => {
      for (const q of questions) {
        const question = q.id
          ? await tx.question.update({
              where: { id: q.id },
              data: {
                dim: q.dim,
                text: q.text,
                order: q.order,
                type: q.type,
                meta: q.meta,
                ...(q.translations !== undefined ? { translations: q.translations } : {}),
              },
            })
          : await tx.question.create({
              data: {
                dim: q.dim,
                text: q.text,
                order: q.order,
                type: q.type,
                meta: q.meta,
                ...(q.translations !== undefined ? { translations: q.translations } : {}),
              },
            });

        const optionIds = new Set<number>();
        for (const o of q.options) {
          if (o.id) {
            const updated = await tx.option.upsert({
              where: { id: o.id },
              update: { label: o.label, score: o.score, value: o.value ?? null, trigger: o.trigger ?? null },
              create: {
                questionId: question.id,
                label: o.label,
                score: o.score,
                value: o.value ?? null,
                trigger: o.trigger ?? null,
              },
            });
            optionIds.add(updated.id);
          } else {
            const created = await tx.option.create({
              data: {
                questionId: question.id,
                label: o.label,
                score: o.score,
                value: o.value ?? null,
                trigger: o.trigger ?? null,
              },
            });
            optionIds.add(created.id);
          }
        }

        await tx.option.deleteMany({
          where: { questionId: question.id, id: { notIn: [...optionIds] } },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
