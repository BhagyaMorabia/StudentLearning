import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

type TraceStatus = 'success' | 'error' | 'cache_hit';

export type LlmTrace = {
  id: string;
  route: string;
  model: string;
  promptVersion: string;
  startedAt: number;
  startedAtDate: Date;
  metadata?: Record<string, unknown>;
};

export function startLlmTrace(input: {
  route: string;
  model: string;
  promptVersion: string;
  metadata?: Record<string, unknown>;
}): LlmTrace {
  return {
    id: randomUUID(),
    route: input.route,
    model: input.model,
    promptVersion: input.promptVersion,
    startedAt: Date.now(),
    startedAtDate: new Date(),
    metadata: input.metadata,
  };
}

export async function finishLlmTrace(
  trace: LlmTrace,
  input: {
    status: TraceStatus;
    prompt: string;
    output?: string;
    error?: unknown;
    cacheScore?: number;
  },
): Promise<void> {
  const endDate = new Date();
  const latencyMs = endDate.getTime() - trace.startedAt;
  const payload = {
    traceId: trace.id,
    route: trace.route,
    model: trace.model,
    promptVersion: trace.promptVersion,
    status: input.status,
    latencyMs,
    promptHash: sha256(input.prompt),
    outputHash: input.output ? sha256(input.output) : undefined,
    error: input.error instanceof Error ? input.error.message : input.error ? String(input.error) : undefined,
    cacheScore: input.cacheScore,
    metadata: trace.metadata,
  };

  console.info(JSON.stringify({ level: 'INFO', action: 'llm.trace', ...payload }));
  await sendHeliconeLog(payload, trace.startedAtDate, endDate);
}

async function sendHeliconeLog(
  payload: Record<string, unknown>,
  startedAt: Date,
  endedAt: Date,
): Promise<void> {
  const apiKey = process.env.HELICONE_API_KEY;
  if (!apiKey) return;

  try {
    await fetch('https://api.worker.helicone.ai/custom/v1/log', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providerRequest: {
          url: 'custom-model-nopath',
          json: {
            _type: 'data',
            name: 'neuraljee_llm_request',
            ...payload,
          },
          meta: {
            'Helicone-Property-Route': String(payload.route ?? ''),
            'Helicone-Property-Model': String(payload.model ?? ''),
            'Helicone-Property-Prompt-Version': String(payload.promptVersion ?? ''),
          },
        },
        providerResponse: {
          status: payload.status === 'error' ? 500 : 200,
          json: {
            _type: 'data',
            name: 'neuraljee_llm_response',
            status: payload.status,
            latencyMs: payload.latencyMs,
            outputHash: payload.outputHash,
            error: payload.error,
          },
        },
        timing: {
          startTime: toHeliconeTime(startedAt),
          endTime: toHeliconeTime(endedAt),
        },
      }),
    });
  } catch (error) {
    console.warn('[LLMObservability] Helicone log skipped', error);
  }
}

function toHeliconeTime(date: Date): { seconds: number; milliseconds: number } {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    milliseconds: date.getMilliseconds(),
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
