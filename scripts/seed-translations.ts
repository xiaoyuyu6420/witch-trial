import { PrismaClient } from "@prisma/client";
import zhCN from "../src/i18n/zh-CN";
import zhTW from "../src/i18n/zh-TW";
import en from "../src/i18n/en";
import ja from "../src/i18n/ja";

const prisma = new PrismaClient();
const locales = { en, ja, "zh-TW": zhTW } as const;

type Translations = Record<string, { text?: string; meta?: string; options?: string[] }>;
type TypeTranslations = Record<string, { name?: string; subtitle?: string; slogan?: string; desc?: string; keywords?: string }>;

async function main() {
  const questions = await prisma.question.findMany({ include: { options: true }, orderBy: { order: "asc" } });

  // Separate normal, gate, trigger questions
  const normalQs = questions.filter((q) => q.type !== "gate" && q.type !== "trigger");
  const gateQs = questions.filter((q) => q.type === "gate");
  const triggerQs = questions.filter((q) => q.type === "trigger");

  let updated = 0;

  // Normal questions
  for (let i = 0; i < normalQs.length; i++) {
    const q = normalQs[i];
    const trans: Translations = {};
    for (const [locale, data] of Object.entries(locales)) {
      const tq = (data.questions as { meta?: string; text?: string; options?: string[] }[])[i];
      if (tq) {
        trans[locale] = { text: tq.text, meta: tq.meta, options: tq.options };
      }
    }
    await prisma.question.update({ where: { id: q.id }, data: { translations: JSON.stringify(trans) } });
    updated++;
  }

  // Gate questions
  for (const q of gateQs) {
    const trans: Translations = {};
    for (const [locale, data] of Object.entries(locales)) {
      const g = (data as Record<string, unknown>).gate as { meta?: string; text?: string; options?: string[] } | undefined;
      if (g) trans[locale] = { text: g.text, meta: g.meta, options: g.options };
    }
    await prisma.question.update({ where: { id: q.id }, data: { translations: JSON.stringify(trans) } });
    updated++;
  }

  // Trigger questions
  for (const q of triggerQs) {
    const trans: Translations = {};
    for (const [locale, data] of Object.entries(locales)) {
      const tr = (data as Record<string, unknown>).trigger as { meta?: string; text?: string; options?: string[] } | undefined;
      if (tr) trans[locale] = { text: tr.text, meta: tr.meta, options: tr.options };
    }
    await prisma.question.update({ where: { id: q.id }, data: { translations: JSON.stringify(trans) } });
    updated++;
  }

  console.log(`Updated ${updated} questions with translations`);

  // Personality types
  const types = await prisma.personalityType.findMany();
  let typeUpdated = 0;
  for (const type of types) {
    const trans: TypeTranslations = {};
    for (const [locale, data] of Object.entries(locales)) {
      const typesMap = data.types as Record<string, { name?: string; subtitle?: string; slogan?: string; desc?: string; keywords?: string }>;
      const tt = typesMap[type.code];
      if (tt) {
        trans[locale] = { name: tt.name, subtitle: tt.subtitle, slogan: tt.slogan, desc: tt.desc, keywords: tt.keywords };
      }
    }
    await prisma.personalityType.update({ where: { id: type.id }, data: { translations: JSON.stringify(trans) } });
    typeUpdated++;
  }
  console.log(`Updated ${typeUpdated} types with translations`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
