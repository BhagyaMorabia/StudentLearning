/**
 * context-builder.ts — Formats retrieved knowledge into Claude's prompt context
 *
 * This is the bridge between the RAG retrieval (raw DB data) and the Claude prompt.
 * The goal is to give Claude enough verified, structured context so it teaches
 * FROM the database, not from hallucinated training memory.
 */

import type { RetrievedContext } from './retrieve';

interface Formula {
  latex: string;
  sympyVerified?: boolean;
  description?: string;
}

/**
 * Builds the teaching context string injected into Claude's user message.
 * Claude's system prompt tells it to treat this as the authoritative source.
 */
export function buildTeachingContext(
  context: RetrievedContext,
  studentWeakTopics: string[],
): string {
  const { targetSubtopic, prerequisites } = context;

  // Format key formulas
  const formulas = (targetSubtopic.keyFormulas as Formula[] | null) ?? [];
  const formulasStr =
    formulas.length > 0
      ? formulas
          .map(
            (f) =>
              `  • ${f.latex}${f.description ? ` — ${f.description}` : ''}${f.sympyVerified === false ? ' ⚠ UNVERIFIED' : ''}`,
          )
          .join('\n')
      : '  (No formulas loaded — derive carefully from first principles)';

  // Format prerequisites
  const prereqStr =
    prerequisites.length > 0
      ? prerequisites
          .map((p) => `  • ${p.name}${p.description ? `: ${p.description.slice(0, 120)}` : ''}`)
          .join('\n')
      : '  • None required — this is a foundational concept';

  // Format common mistakes
  const mistakes = targetSubtopic.commonMistakes ?? [];
  const mistakesStr =
    mistakes.length > 0
      ? mistakes.map((m) => `  • ${m}`).join('\n')
      : '  • None documented yet';

  // Format student weak areas
  const weakStr =
    studentWeakTopics.length > 0
      ? studentWeakTopics.join(', ')
      : 'No weak topics identified yet';

  return `
═══════════════════════════════════════════════════════════════
VERIFIED KNOWLEDGE BASE CONTEXT
═══════════════════════════════════════════════════════════════

TARGET SUBTOPIC: ${targetSubtopic.name}
${targetSubtopic.description ? `DESCRIPTION: ${targetSubtopic.description}` : ''}

━━━ RAW CONTENT FROM VERIFIED SOURCE ━━━━━━━━━━━━━━━━━━━━━━━━
${targetSubtopic.rawContent ?? 'Expert content pending review. Use your knowledge carefully and flag any uncertainty.'}

━━━ KEY FORMULAS (use EXACTLY as listed — all LaTeX-formatted) ━
${formulasStr}

━━━ PREREQUISITE KNOWLEDGE (student should already know these) ━
${prereqStr}

━━━ COMMON STUDENT MISTAKES FOR THIS TOPIC ━━━━━━━━━━━━━━━━━━━
${mistakesStr}

━━━ JEE METADATA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Appears in ~${targetSubtopic.pyqFrequency ?? 0} PYQ questions
• Estimated study time: ${targetSubtopic.estimatedMinutes ?? 15} minutes

━━━ STUDENT'S CURRENT WEAK AREAS (adapt explanation to these) ━
${weakStr}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS: Teach "${targetSubtopic.name}" using the VERIFIED CONTENT above 
as your PRIMARY authoritative source. 
CRITICAL RULES:
• Do NOT introduce formulas not listed in KEY FORMULAS above
• Do NOT contradict the verified raw content  
• Adapt your explanation to address the student's known weak areas
• If raw content is empty, teach from first principles but flag it
═══════════════════════════════════════════════════════════════
`.trim();
}

/**
 * Builds context for quiz question generation.
 * Less verbose than teaching context — focuses on formula accuracy.
 */
export function buildQuizContext(context: RetrievedContext): string {
  const { targetSubtopic } = context;
  const formulas = (targetSubtopic.keyFormulas as Formula[] | null) ?? [];

  const formulasStr =
    formulas.length > 0
      ? formulas.map((f) => `  • ${f.latex}`).join('\n')
      : '  (Generate questions from general JEE syllabus for this topic)';

  return `
SUBTOPIC: ${targetSubtopic.name}
VERIFIED FORMULAS TO TEST:
${formulasStr}
DIFFICULTY CONTEXT: This topic appears in ~${targetSubtopic.pyqFrequency ?? 0} PYQ questions.
COMMON MISTAKES TO PROBE: ${(targetSubtopic.commonMistakes ?? []).join('; ') || 'None listed'}
`.trim();
}
