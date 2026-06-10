import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const LOCALE_SUFFIX: Record<string, string> = {
  en: "en",
  ja: "ja",
  "zh-TW": "zhTW",
};

function parseRow(row: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    result[k] = v === undefined || v === null ? "" : v;
  }
  return result;
}

export async function POST(req: NextRequest) {
  const authErr = checkAdminAuth(req);
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "文件过大，限制 5MB" }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });

    const transLocales = ["en", "ja", "zh-TW"];

    // Pre-parse all data outside transaction
    const questionsData: { order: number; row: Record<string, unknown>; existing: { id: number; options: { id: number }[] } | null }[] = [];
    const typesData: { code: string; row: Record<string, unknown>; existingId: number | null }[] = [];

    // --- Parse Questions sheet ---
    const qSheet = wb.Sheets["Questions"];
    if (qSheet) {
      const qRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(qSheet);

      for (const rawRow of qRows) {
        const row = parseRow(rawRow);
        const order = Number(row.order);
        if (isNaN(order)) continue;

        const existing = await db.question.findFirst({
          where: { order },
          include: { options: { orderBy: { id: "asc" }, select: { id: true } } },
        });

        questionsData.push({ order, row, existing });
      }
    }

    // --- Parse Types sheet ---
    const tSheet = wb.Sheets["Types"];
    if (tSheet) {
      const tRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(tSheet);

      for (const rawRow of tRows) {
        const row = parseRow(rawRow);
        const code = String(row.code || "").trim();
        if (!code) continue;

        const existing = await db.personalityType.findUnique({ where: { code }, select: { id: true } });
        typesData.push({ code, row, existingId: existing?.id ?? null });
      }
    }

    // --- Execute all writes in a single transaction ---
    let updatedQuestions = 0;
    let updatedTypes = 0;

    await db.$transaction(async (tx) => {
      // Process Questions
      for (const { order, row, existing } of questionsData) {
        const trans: Record<string, Record<string, string | string[]>> = {};

        for (const loc of transLocales) {
          const suffix = LOCALE_SUFFIX[loc];
          const text = String(row[`text_${suffix}`] || "");
          const meta = String(row[`meta_${suffix}`] || "");
          if (text || meta) {
            trans[loc] = { text, meta };
          }
        }

        // Collect options
        const options: { label: string; score: number; value?: string; trigger?: string }[] = [];
        const optTranslations: Record<string, string[]> = {};
        for (const loc of transLocales) optTranslations[loc] = [];

        let optIdx = 1;
        const maxExistingOpts = existing?.options.length || 0;
        while (true) {
          const optZh = String(row[`opt${optIdx}_zhCN`] || "");
          if (!optZh && !existing) break;
          if (!optZh && optIdx > maxExistingOpts) break;

          const score = Number(row[`opt${optIdx}_score`]) || 0;
          const value = String(row[`opt${optIdx}_value`] || "") || undefined;
          const trigger = String(row[`opt${optIdx}_trigger`] || "") || undefined;

          options.push({ label: optZh, score, value, trigger });

          for (const loc of transLocales) {
            const suffix = LOCALE_SUFFIX[loc];
            optTranslations[loc].push(String(row[`opt${optIdx}_${suffix}`] || ""));
          }
          optIdx++;
        }

        for (const loc of transLocales) {
          if (optTranslations[loc].some((v) => v)) {
            if (!trans[loc]) trans[loc] = {};
            trans[loc].options = optTranslations[loc];
          }
        }

        const translationsStr = JSON.stringify(trans);

        if (existing) {
          await tx.question.update({
            where: { id: existing.id },
            data: {
              dim: String(row.dim || ""),
              type: (row.type as "normal" | "gate" | "trigger") || "normal",
              meta: String(row.meta ?? ""),
              text: String(row.text_zhCN || ""),
              translations: translationsStr,
            },
          });

          // Collect option IDs to keep
          const keepIds: number[] = [];
          for (let i = 0; i < options.length; i++) {
            if (i < existing.options.length) {
              keepIds.push(existing.options[i].id);
              await tx.option.update({
                where: { id: existing.options[i].id },
                data: {
                  label: options[i].label,
                  score: options[i].score,
                  value: options[i].value,
                  trigger: options[i].trigger,
                },
              });
            } else {
              const created = await tx.option.create({
                data: {
                  questionId: existing.id,
                  label: options[i].label,
                  score: options[i].score,
                  value: options[i].value,
                  trigger: options[i].trigger,
                },
              });
              keepIds.push(created.id);
            }
          }

          // Delete options not in the uploaded data
          await tx.option.deleteMany({
            where: { questionId: existing.id, id: { notIn: keepIds } },
          });

          updatedQuestions++;
        } else {
          await tx.question.create({
            data: {
              order,
              dim: String(row.dim || ""),
              type: (row.type as "normal" | "gate" | "trigger") || "normal",
              meta: String(row.meta || ""),
              text: String(row.text_zhCN || ""),
              translations: translationsStr,
              options: {
                create: options.map((o) => ({
                  label: o.label,
                  score: o.score,
                  value: o.value,
                  trigger: o.trigger,
                })),
              },
            },
          });
          updatedQuestions++;
        }
      }

      // Process Types
      for (const { code, row, existingId } of typesData) {
        const trans: Record<string, Record<string, string>> = {};
        const fields = ["name", "subtitle", "slogan", "desc", "keywords"];

        for (const loc of transLocales) {
          const suffix = LOCALE_SUFFIX[loc];
          const locTrans: Record<string, string> = {};
          for (const f of fields) {
            const val = String(row[`${f}_${suffix}`] || "");
            if (val) locTrans[f] = val;
          }
          if (Object.keys(locTrans).length > 0) {
            trans[loc] = locTrans;
          }
        }

        const translationsStr = JSON.stringify(trans);

        if (existingId !== null) {
          await tx.personalityType.update({
            where: { id: existingId },
            data: {
              name: String(row.name_zhCN || ""),
              subtitle: String(row.subtitle_zhCN ?? ""),
              slogan: String(row.slogan_zhCN ?? ""),
              desc: String(row.desc_zhCN ?? ""),
              keywords: String(row.keywords_zhCN ?? ""),
              group: String(row.group ?? ""),
              vector: String(row.vector ?? ""),
              special: row.special === true || row.special === "true" || row.special === 1,
              translations: translationsStr,
            },
          });
        } else {
          await tx.personalityType.create({
            data: {
              code,
              name: String(row.name_zhCN || ""),
              subtitle: String(row.subtitle_zhCN || ""),
              slogan: String(row.slogan_zhCN || ""),
              desc: String(row.desc_zhCN || ""),
              keywords: String(row.keywords_zhCN || ""),
              group: String(row.group || ""),
              vector: String(row.vector || ""),
              special: row.special === true || row.special === "true" || row.special === 1,
              translations: translationsStr,
            },
          });
        }
        updatedTypes++;
      }
    });

    return NextResponse.json({ ok: true, updatedQuestions, updatedTypes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "导入失败: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
