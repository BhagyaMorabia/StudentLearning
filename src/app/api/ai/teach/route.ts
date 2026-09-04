/**
 * POST /api/ai/teach
 *
 * The core AI Tutor endpoint.
 * Fetches verified knowledge base content (RAG) and teaches it to the student
 * strictly adhering to the JEE pedagogical format (intuition, formulas, worked example).
 * Returns structured JSON matching TeachResponseSchema.
 */

import { getAuthenticatedClerkUserId } from '@/lib/auth/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GEMINI_MODEL, getGeminiClient } from '@/lib/ai/client';
import { TEACH_SYSTEM_PROMPT } from '@/lib/ai/prompts/teach';
import { retrieveContextForSubtopic } from '@/lib/rag/retrieve';
import { buildTeachingContext } from '@/lib/rag/context-builder';
import { checkRateLimit } from '@/lib/rate-limit';
import { TeachResponseSchema } from '@/lib/ai/schemas';
import { db } from '@/lib/db/client';
import { studentMastery, subtopics } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { finishLlmTrace, startLlmTrace } from '@/lib/ai/observability';
import { getSemanticCache, setSemanticCache } from '@/lib/ai/semantic-cache';

const RequestSchema = z.object({
  subtopicId: z.string().uuid(),
});

const PROMPT_VERSION = 'teach-v2-context-2026-08-29';

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedClerkUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await checkRateLimit('teach', userId);
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded (30 teach sessions per hour)' }, { status: 429 });
  }

  let subtopicId: string;
  try {
    const body = await req.json();
    ({ subtopicId } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  try {
    // 1. Resolve internal user ID
    const { getUserId } = await import('@/lib/db/queries/mastery');
    const internalUserId = await getUserId(userId);
    
    // 2. Fetch student's weak topics to personalize teaching
    let weakTopics: string[] = [];
    if (internalUserId) {
      const weakRows = await db
        .select({ name: subtopics.name })
        .from(studentMastery)
        .innerJoin(subtopics, eq(studentMastery.subtopicId, subtopics.id))
        .where(
          and(
            eq(studentMastery.userId, internalUserId),
            eq(studentMastery.status, 'WEAK')
          )
        )
        .limit(5);
      weakTopics = weakRows.map(r => r.name);
    }

    // 3. RAG Retrieval
    // Get the subtopic context, prerequisites, and semantically similar subtopics
    const retrievedContext = await retrieveContextForSubtopic(subtopicId);
    
    // 4. Build Context String
    const prompt = buildTeachingContext(retrievedContext, weakTopics);
    const trace = startLlmTrace({
      route: 'api.ai.teach',
      model: GEMINI_MODEL,
      promptVersion: PROMPT_VERSION,
      metadata: { subtopicId, userId },
    });

    const cachedResponse = await getSemanticCache({
      route: 'api.ai.teach',
      model: GEMINI_MODEL,
      promptVersion: PROMPT_VERSION,
      prompt,
    });

    if (cachedResponse) {
      const cachedJson = parseModelJson(cachedResponse);
      const cachedTeaching = TeachResponseSchema.safeParse(cachedJson);
      if (cachedTeaching.success) {
        await finishLlmTrace(trace, {
          status: 'cache_hit',
          prompt,
          output: cachedResponse,
        });
        return Response.json({ success: true, data: cachedTeaching.data, source: 'semantic_cache' });
      }
    }

    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: TEACH_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const parsedJson = parseModelJson(response.text ?? '');
    const parsedTeaching = TeachResponseSchema.safeParse(parsedJson);
    if (!parsedTeaching.success) {
      console.warn('[teach] Model response failed schema validation:', parsedTeaching.error.flatten());
      await finishLlmTrace(trace, {
        status: 'error',
        prompt,
        output: response.text ?? '',
        error: parsedTeaching.error,
      });
      return Response.json({ error: 'Tutor response failed schema validation' }, { status: 502 });
    }

    await setSemanticCache({
      route: 'api.ai.teach',
      model: GEMINI_MODEL,
      promptVersion: PROMPT_VERSION,
      prompt,
      response: response.text ?? '',
    });
    await finishLlmTrace(trace, {
      status: 'success',
      prompt,
      output: response.text ?? '',
    });

    return Response.json({ success: true, data: parsedTeaching.data });
  } catch (error) {
    console.error('[teach] Route Error:', error);
    return Response.json({ error: 'Failed to generate teaching content' }, { status: 500 });
  }
}

function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(withoutFence);
}
