/**
 * POST /api/ai/doubt
 *
 * Socratic doubt-solving chat. Conversational, multi-turn.
 * Streams plain markdown (not JSON) — displayed directly in the chat UI.
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { anthropic, CLAUDE_MODEL } from '@/lib/ai/client';
import { DOUBT_SYSTEM_PROMPT } from '@/lib/ai/prompts/doubt';
import { checkRateLimit } from '@/lib/rate-limit';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20), // Full conversation history
  subtopicId: z.string().uuid().optional(), // Optional context
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { success } = await checkRateLimit('doubt', userId);
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded (20 doubt sessions per hour)' }, { status: 429 });
  }

  let messages: z.infer<typeof MessageSchema>[];
  try {
    const body = await req.json();
    ({ messages } = RequestSchema.parse(body));
  } catch (err) {
    return Response.json({ error: 'Invalid request', detail: String(err) }, { status: 400 });
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          const stream = anthropic.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 512, // Keep responses concise for Socratic dialogue
            system: DOUBT_SYSTEM_PROMPT,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          });

          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(
            new TextEncoder().encode(`\n\n*Error: ${String(err)}*`),
          );
        } finally {
          controller.close();
        }
      },
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
