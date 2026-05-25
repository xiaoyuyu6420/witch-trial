import { z } from "zod";

export const matchRequestSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      optionId: z.number().int().positive(),
      // dim/score are accepted for backward compat but ignored server-side;
      // the server re-derives them from the DB option to prevent tampering.
      dim: z.string().min(1).max(10).optional(),
      score: z.number().min(0).max(10).optional(),
    })
  ).min(1).max(100),
  gateValue: z.enum(["destroy", "endure", "normal", "normal_alt"]).optional(),
  triggerFired: z.string().max(50).optional(),
});

export const resultsRequestSchema = z.object({
  sessionId: z.string().min(1).max(200),
  // resultCode/similarity/userVector/top3/borderType accepted for backwards compat
  // but ignored; the server re-runs match() from answers.
  resultCode: z.string().min(1).max(50).optional(),
  similarity: z.number().min(0).max(100).optional(),
  userVector: z.string().max(50).optional(),
  top3: z.array(
    z.object({
      code: z.string().max(50),
      name: z.string().max(200),
      similarity: z.number().min(0).max(100),
    })
  ).max(10).optional(),
  borderType: z.boolean().optional(),
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      optionId: z.number().int().positive(),
    })
  ).min(1).max(100),
  gateValue: z.string().max(50).optional().nullable(),
  triggerFired: z.string().max(50).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
  screenRes: z.string().max(50).optional().nullable(),
  language: z.string().max(50).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  startedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  duration: z.number().min(0).optional().nullable(),
});

// ===== Admin schemas =====

const optionInputSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().min(1).max(1000),
  score: z.number().int().min(-10).max(10).default(0),
  value: z.string().max(50).optional().nullable(),
  trigger: z.string().max(50).optional().nullable(),
});

export const adminQuestionUpdateSchema = z.object({
  dim: z.string().min(1).max(20),
  text: z.string().min(1).max(2000),
  order: z.number().int().positive(),
  type: z.enum(["normal", "gate", "trigger"]),
  meta: z.string().max(200).default(""),
  translations: z.string().max(50_000).optional(),
  options: z.array(optionInputSchema).min(1).max(10),
});

export const adminQuestionBulkSchema = z.array(
  adminQuestionUpdateSchema.extend({ id: z.number().int().positive().optional() })
).max(50);

export const adminTypeUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  subtitle: z.string().max(200).optional().nullable(),
  group: z.string().min(1).max(50),
  vector: z.string().regex(
    /^[LMHX]{3}-[LMHX]{3}-[LMHX]{3}-[LMHX]{3}$/,
    "vector must be 'XXX-XXX-XXX-XXX' with chars L/M/H/X"
  ),
  slogan: z.string().min(1).max(500),
  desc: z.string().min(1).max(5000),
  keywords: z.string().max(500).optional().nullable(),
  special: z.boolean().optional(),
  translations: z.string().max(50_000).optional(),
});

export const adminTypeBulkSchema = z.array(
  adminTypeUpdateSchema.extend({ code: z.string().min(1).max(50) })
).max(50);
