import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000; // Total rows across all sheets
const TRANSACTION_TIMEOUT_MS = 30_000; // 30s timeout for DB transaction

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

    // Parse sheet data outside transaction (raw parse only)
    const transLocales = ["en", "ja", "zh-TW"];

    const qSheet = wb.Sheets["Questions"];
    const qRows = qSheet
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(qSheet)
          .map((r) => {
            const raw = parseRow(r);
            return { raw, order: Number(raw.order) };
          })
          .filter((r) => r.order > 0 && !isNaN(r.order))
      : [];

    const tSheet = wb.Sheets["Types"];
    const tRows = tSheet
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(tSheet)
          .map((r) => {
            const raw = parseRow(r);
            return { raw, code: String(raw.code || "").trim() };
          })
          .filter((r) => !!r.code)
      : [];

    // Row limit check
    const totalRows = qRows.length + tRows.length;
    if (totalRows > MAX_ROWS) {
      return NextResponse.json(
        { error: `数据行数过多 (${totalRows})，限制最多 ${MAX_ROWS} 行` },
        { status: 413 },
      );
    }

    if (totalRows === 0) {
      return NextResponse.json({ ok: true, updatedQuestions: 0, updatedTypes: 0 });
    }

    console.log(`[admin/import] Processing ${qRows.length} questions, ${tRows.length} types`);

    // Batch-fetch existing records (eliminates N+1 queries)
    const questionOrders = qRows.map((r) => r.order);
    const existingQuestions = await db.question.findMany({
      where: { order: { in: questionOrders } },
      include: { options: { orderBy: { id: "asc" }, select: { id: true } } },
    });
    const questionMap = new Map(existingQuestions.map((q) => [q.order, q]));

    const typeCodes = tRows.map((r) => r.code);
    const existingTypes = await db.personalityType.findMany({
      where: { code: { in: typeCodes } },
      select: { id: true, code: true },
    });
    const typeMap = new Map(existingTypes.map((t) => [t.code, t.id]));

    // --- Execute all writes in a single transaction with timeout ---
    let updatedQuestions = 0;
    let updatedTypes = 0;

    const transactionWork = db.$transaction(async (tx) => {
      // Process Questions
      for (const { order, raw: row } of qRows) {
        const existing = questionMap.get(order) ?? null;

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
      for (const { code, raw: row } of tRows) {
        const existingId = typeMap.get(code) ?? null;

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

    // Race transaction against timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("导入超时，请减少数据量后重试")), TRANSACTION_TIMEOUT_MS),
    );
    await Promise.race([transactionWork, timeoutPromise]);

    console.log(`[admin/import] Done: ${updatedQuestions} questions, ${updatedTypes} types`);

    return NextResponse.json({ ok: true, updatedQuestions, updatedTypes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "导入失败: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
