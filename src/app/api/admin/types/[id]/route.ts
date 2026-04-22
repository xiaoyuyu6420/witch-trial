import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

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
    const body = (await req.json()) as {
      name?: string;
      subtitle?: string;
      group?: string;
      vector?: string;
      slogan?: string;
      desc?: string;
      keywords?: string;
      special?: boolean;
      translations?: string;
    };

    const t = await db.personalityType.update({
      where: { id: Number(id) },
      data: body,
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
