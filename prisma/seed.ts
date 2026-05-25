import { PrismaClient } from "@prisma/client";
import { PERSONALITY_TYPES, QUESTIONS } from "../src/data/quiz-content";

const prisma = new PrismaClient();

async function main() {
  const existingQuestions = await prisma.question.count();
  if (existingQuestions > 0) {
    console.log(`Seed skipped: ${existingQuestions} questions already exist in DB`);
    return;
  }

  console.log("Seeding personality types...");
  for (const t of PERSONALITY_TYPES) {
    await prisma.personalityType.upsert({
      where: { code: t.code },
      update: {
        name: t.name, subtitle: t.subtitle ?? null, group: t.group,
        vector: t.vector, slogan: t.slogan, desc: t.desc,
        keywords: t.keywords ?? null, special: t.special ?? false,
      },
      create: {
        code: t.code, name: t.name, subtitle: t.subtitle ?? null, group: t.group,
        vector: t.vector, slogan: t.slogan, desc: t.desc,
        keywords: t.keywords ?? null, special: t.special ?? false,
      },
    });
  }
  console.log(`  → ${PERSONALITY_TYPES.length} types seeded`);

  console.log("Seeding questions...");
  await prisma.answer.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const question = await prisma.question.create({
      data: {
        dim: q.dim, text: q.text, order: i + 1, type: q.type, meta: q.meta ?? "",
        options: {
          create: q.options.map((o, j) => ({
            label: o.label,
            score: o.score ?? j + 1,
            value: o.value ?? null,
            trigger: o.trigger ?? null,
          })),
        },
      },
    });
  }
  console.log(`  → ${QUESTIONS.length} questions seeded`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
