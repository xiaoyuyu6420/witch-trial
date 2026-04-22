import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const record = await db.testRecord.findUnique({
      where: { id: Number(id) },
      include: {
        answers: {
          include: {
            question: {
              include: { options: true },
            },
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
