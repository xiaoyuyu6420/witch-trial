import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const LOCALE_MAP: { db: string; suffix: string }[] = [
  { db: "zh-CN", suffix: "zhCN" },
  { db: "en", suffix: "en" },
  { db: "ja", suffix: "ja" },
  { db: "zh-TW", suffix: "zhTW" },
];

function getTransField(trans: Record<string, Record<string, unknown>>, locale: string, field: string): string {
  return (trans[locale]?.[field] as string) || "";
}

function getTransArr(trans: Record<string, Record<string, unknown>>, locale: string, field: string, idx: number): string {
  return ((trans[locale]?.[field] as string[])?.[idx]) || "";
}

export async function GET(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;

  try {
    const questions = await db.question.findMany({
      orderBy: { order: "asc" },
      include: { options: { orderBy: { id: "asc" } } },
    });

    const types = await db.personalityType.findMany({ orderBy: { id: "asc" } });

    // --- Sheet 1: Questions ---
    const qRows: Record<string, string | number>[] = [];
    for (const q of questions) {
      const trans: Record<string, Record<string, unknown>> = JSON.parse(q.translations || "{}");
      const row: Record<string, string | number> = {
        order: q.order,
        dim: q.dim,
        type: q.type,
      };

      for (const { db: loc, suffix } of LOCALE_MAP) {
        const baseField = loc === "zh-CN";
        row[`text_${suffix}`] = baseField ? q.text : getTransField(trans, loc, "text");
        row[`meta_${suffix}`] = baseField ? (q.meta || "") : getTransField(trans, loc, "meta");
      }

      for (let i = 0; i < q.options.length; i++) {
        const o = q.options[i];
        const n = i + 1;
        for (const { db: loc, suffix } of LOCALE_MAP) {
          row[`opt${n}_${suffix}`] = loc === "zh-CN" ? o.label : getTransArr(trans, loc, "options", i);
        }
        row[`opt${n}_score`] = o.score;
        row[`opt${n}_value`] = o.value || "";
        row[`opt${n}_trigger`] = o.trigger || "";
      }

      qRows.push(row);
    }

    // --- Sheet 2: Types ---
    const TYPE_FIELDS = ["name", "subtitle", "slogan", "desc", "keywords"] as const;
    const tRows: Record<string, string | number | boolean>[] = [];
    for (const t of types) {
      const trans: Record<string, Record<string, unknown>> = JSON.parse(t.translations || "{}");
      const row: Record<string, string | number | boolean> = {
        code: t.code,
      };

      for (const { db: loc, suffix } of LOCALE_MAP) {
        const baseField = loc === "zh-CN";
        for (const f of TYPE_FIELDS) {
          row[`${f}_${suffix}`] = baseField ? (t[f] || "") : getTransField(trans, loc, f);
        }
      }

      row.group = t.group;
      row.vector = t.vector;
      row.special = t.special;
      tRows.push(row);
    }

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(qRows);
    const ws2 = XLSX.utils.json_to_sheet(tRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Questions");
    XLSX.utils.book_append_sheet(wb, ws2, "Types");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="witch-trial-template.xlsx"',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
