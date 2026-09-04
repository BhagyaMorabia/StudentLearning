/**
 * ai/schemas.ts — Zod schemas for validating AI JSON outputs
 *
 * Why validate AI output? Claude occasionally produces malformed JSON
 * or missing fields. These schemas catch that at the boundary so
 * components always get typed, complete data.
 */

import { z } from 'zod';

const SolutionStepSchema = z.object({
  step: z.number(),
  explanation: z.string(),
  math: z.string().optional(),
});


// ── Remediation Response ────────────────────────────────────────────────────

export const RemediationResponseSchema = z.object({
  diagnosis: z.string(),
  misconception: z.string(),
  correction: z.object({
    explanation: z.string(),
    steps: z.array(SolutionStepSchema),
    correct_answer: z.string(),
  }),
  remember: z.string(),
  practice_hint: z.string(),
});

export type RemediationResponse = z.infer<typeof RemediationResponseSchema>;

// ── Client-safe Question (no correctAnswer, no isCorrect on options) ────────

export const ClientQuestionSchema = z.object({
  id: z.string().uuid(),
  questionText: z.string(),
  questionType: z.enum(['MCQ', 'MSQ', 'INTEGER', 'NUMERICAL']),
  options: z.array(z.object({ id: z.string(), text: z.string() })).nullable(),
  difficultyLevel: z.number(),
  expectedTimeSeconds: z.number(),
  conceptsTested: z.array(z.string()),
});

export type ClientQuestion = z.infer<typeof ClientQuestionSchema>;

// ── Teach Response ──────────────────────────────────────────────────────────

export const TeachResponseSchema = z.object({
  hook: z.string(),
  intuition: z.string(),
  core_concept: z.string(),
  worked_example: z.object({
    problem: z.string(),
    solution: z.array(SolutionStepSchema),
    jee_tip: z.string(),
  }),
  diagram_spec: z.object({
    type: z.enum(['force_diagram', 'energy_diagram', 'flowchart', 'graph', 'circuit', 'orbital', 'wave', 'null']).nullable(),
    mermaid_code: z.string().nullable(),
    description: z.string().nullable(),
  }),
  common_mistakes: z.array(z.string()),
  jee_context: z.string(),
  key_takeaways: z.array(z.string()),
  content_warning: z.boolean(),
});

export type TeachResponse = z.infer<typeof TeachResponseSchema>;
