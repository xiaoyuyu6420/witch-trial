import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const types = await db.personalityType.findMany();
    return NextResponse.json(types);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;
  try {
    const types = (await req.json()) as {
      code: string;
      name?: string;
      subtitle?: string;
      group?: string;
      vector?: string;
      slogan?: string;
      desc?: string;
      keywords?: string;
      special?: boolean;
    }[];

    await db.$transaction(
      types.map((t) =>
        db.personalityType.upsert({
          where: { code: t.code },
          update: {
            name: t.name,
            subtitle: t.subtitle,
            group: t.group,
            vector: t.vector,
            slogan: t.slogan,
            desc: t.desc,
            keywords: t.keywords,
            special: t.special,
          },
          create: {
            code: t.code,
            name: t.name ?? "",
            subtitle: t.subtitle,
            group: t.group ?? "",
            vector: t.vector ?? "",
            slogan: t.slogan ?? "",
            desc: t.desc ?? "",
            keywords: t.keywords,
            special: t.special ?? false,
          },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
