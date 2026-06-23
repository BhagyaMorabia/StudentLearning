/**
 * POST /api/ai/teach
 *
 * Flow:
 * 1. Auth (Clerk) → 401 if unauthenticated
 * 2. Rate limit → 429 if exceeded
 * 3. Validate subtopicId (must be UUID)
 * 4. Check Redis cache → return cached if found
 * 5. RAG retrieval (prerequisites + similar subtopics)
 * 6. Get student's weak topics from mastery table
 * 7. Build context string for Claude
 * 8. Stream Claude response
 * 9. Cache complete response in Redis (24h)
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { anthropic, CLAUDE_MODEL } from '@/lib/ai/client';
import { TEACH_SYSTEM_PROMPT } from '@/lib/ai/prompts/teach';
import { retrieveContextForSubtopic } from '@/lib/rag/retrieve';
import { buildTeachingContext } from '@/lib/rag/context-builder';
import { getStudentWeakTopics } from '@/lib/db/queries/mastery';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCachedContent, setCachedContent } from '@/lib/cache/redis';

const RequestSchema = z.object({
  subtopicId: z.string().uuid('subtopicId must be a valid UUID'),
});

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Rate limiting ─────────────────────────────────────────────────────
  const { success, remaining } = await checkRateLimit('teach', userId);
  if (!success) {
    return Response.json(
      { error: 'Rate limit exceeded. You can request 30 teaching sessions per hour.' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      },
    );
  }

  // ── 3. Validate input ────────────────────────────────────────────────────
  let subtopicId: string;
  try {
    const body = await req.json();
    ({ subtopicId } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request body', detail: String(err) }, { status: 400 });
  }

  // ── 4. Check Redis cache ─────────────────────────────────────────────────
  // Cache key is per-subtopic (not per-user — same content for all students)
  const cacheKey = `teach:${subtopicId}`;
  const cached = await getCachedContent(cacheKey);
  if (cached) {
    return Response.json({ success: true, data: cached, cached: true });
  }

  // ── 5. RAG retrieval ─────────────────────────────────────────────────────
  let context;
  try {
    context = await retrieveContextForSubtopic(
      subtopicId,
      undefined, // Skip vector search for teach (use graph only for speed)
    );
  } catch (err) {
    return Response.json({ error: 'Subtopic not found', detail: String(err) }, { status: 404 });
  }

  // ── 6. Student weak topics ───────────────────────────────────────────────
  const weakTopics = await getStudentWeakTopics(userId);

  // ── 7. Build context ─────────────────────────────────────────────────────
  const ragContext = buildTeachingContext(context, weakTopics);
  const userMessage = `${ragContext}\n\nNow teach me: ${context.targetSubtopic.name}`;

  // ── 8. Stream Claude response ────────────────────────────────────────────
  return new Response(
    new ReadableStream({
      async start(controller) {
        let fullText = '';

        try {
          const stream = anthropic.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 2048,
            system: TEACH_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
          });

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text;
              controller.enqueue(new TextEncoder().encode(text));
              fullText += text;
            }
          }

          // ── 9. Cache the complete response ─────────────────────────────
          try {
            const parsed = JSON.parse(fullText);
            await setCachedContent(cacheKey, parsed, 86400); // 24h
          } catch {
            // JSON parse failed — Claude produced malformed output. Log it.
            console.error('[teach] Failed to parse Claude response as JSON:', fullText.slice(0, 200));
          }
        } catch (err) {
          const errorMsg = JSON.stringify({ error: 'AI generation failed', detail: String(err) });
          controller.enqueue(new TextEncoder().encode(errorMsg));
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-RateLimit-Remaining': String(remaining),
      },
    },
  );
}
