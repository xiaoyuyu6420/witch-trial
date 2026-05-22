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
  resultCode: z.string().min(1).max(50),
  similarity: z.number().min(0).max(100),
  userVector: z.string().max(50),
  top3: z.array(
    z.object({
      code: z.string().max(50),
      name: z.string().max(200),
      similarity: z.number().min(0).max(100),
    })
  ).max(10),
  borderType: z.boolean().optional(),
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      optionId: z.number().int().positive(),
    })
  ).optional(),
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
