import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const question = await db.question.findUnique({
      where: { id: Number(id) },
      include: { options: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(question);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      dim: string;
      text: string;
      order: number;
      type: string;
      meta: string;
      translations?: string;
      options: { id?: number; label: string; score: number; value?: string; trigger?: string }[];
    };

    const question = await db.question.update({
      where: { id: Number(id) },
      data: {
        dim: body.dim, text: body.text, order: body.order, type: body.type, meta: body.meta,
        ...(body.translations !== undefined ? { translations: body.translations } : {}),
      },
    });

    const optionIds = new Set<number>();
    for (const o of body.options) {
      if (o.id) {
        optionIds.add(o.id);
      }
    }

    // Upsert options
    for (const o of body.options) {
      if (o.id) {
        await db.option.upsert({
          where: { id: o.id },
          update: { label: o.label, score: o.score, value: o.value, trigger: o.trigger },
          create: {
            questionId: question.id,
            label: o.label,
            score: o.score,
            value: o.value,
            trigger: o.trigger,
          },
        });
      } else {
        const created = await db.option.create({
          data: {
            questionId: question.id,
            label: o.label,
            score: o.score,
            value: o.value,
            trigger: o.trigger,
          },
        });
        optionIds.add(created.id);
      }
    }

    // Delete removed options
    await db.option.deleteMany({
      where: { questionId: question.id, id: { notIn: [...optionIds] } },
    });

    return NextResponse.json(question);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { id } = await params;
    await db.question.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
