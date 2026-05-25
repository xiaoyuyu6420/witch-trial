import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";
import { adminTypeUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const t = await db.personalityType.findUnique({ where: { id: Number(id) } });
    if (!t) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(t);
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
    const parsed = adminTypeUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const t = await db.personalityType.update({
      where: { id: Number(id) },
      data: {
        name: body.name,
        subtitle: body.subtitle ?? null,
        group: body.group,
        vector: body.vector,
        slogan: body.slogan,
        desc: body.desc,
        keywords: body.keywords ?? null,
        ...(body.special !== undefined ? { special: body.special } : {}),
        ...(body.translations !== undefined ? { translations: body.translations } : {}),
      },
    });

    return NextResponse.json(t);
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
    await db.personalityType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
