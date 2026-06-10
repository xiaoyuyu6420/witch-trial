import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";
import { adminTypeBulkSchema } from "@/lib/schemas";
import { apiError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const types = await db.personalityType.findMany();
    return NextResponse.json(types);
  } catch (e) {
    console.error(e);
    return apiError("Failed to update types", 500, e);
  }
}

export async function PUT(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const parsed = adminTypeBulkSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const types = parsed.data;

    await db.$transaction(
      types.map((t) =>
        db.personalityType.upsert({
          where: { code: t.code },
          update: {
            name: t.name,
            subtitle: t.subtitle ?? null,
            group: t.group,
            vector: t.vector,
            slogan: t.slogan,
            desc: t.desc,
            keywords: t.keywords ?? null,
            ...(t.special !== undefined ? { special: t.special } : {}),
            ...(t.translations !== undefined ? { translations: t.translations } : {}),
          },
          create: {
            code: t.code,
            name: t.name,
            subtitle: t.subtitle ?? null,
            group: t.group,
            vector: t.vector,
            slogan: t.slogan,
            desc: t.desc,
            keywords: t.keywords ?? null,
            special: t.special ?? false,
            ...(t.translations !== undefined ? { translations: t.translations } : {}),
          },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return apiError("Failed to update types", 500, e);
  }
}
