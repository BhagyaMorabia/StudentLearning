import 'server-only';

import { createHash } from 'node:crypto';

import { embed } from '@/lib/rag/embed';
import { logger } from '@/lib/logger';

const CACHE_NAMESPACE = process.env.UPSTASH_VECTOR_LLM_CACHE_NAMESPACE ?? 'llm-cache';
const DEFAULT_THRESHOLD = 0.97;
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

/**
 * Upstash Vector REST filter strings look like SQL. Treat them with the
 * same respect: never string-interpolate untrusted input without escaping.
 *
 * Single quotes and backslashes are the two characters that can break out
 * of a quoted-string literal in the Upstash dialect.
 */
function escapeFilterLiteral(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function buildFilter(input: { route: string; model: string; promptVersion: string }) {
  return [
    `route = '${escapeFilterLiteral(input.route)}'`,
    `model = '${escapeFilterLiteral(input.model)}'`,
    `promptVersion = '${escapeFilterLiteral(input.promptVersion)}'`,
  ].join(' AND ');
}

type CacheMetadata = {
  route: string;
  model: string;
  promptVersion: string;
  promptHash: string;
  createdAt: string;
  expiresAt: string;
};

type QueryResult = {
  id: string;
  score: number;
  metadata?: Partial<CacheMetadata>;
  data?: string;
};

function getVectorConfig() {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) return null;

  return {
    url: url.replace(/\/$/, ''),
    token,
  };
}

function cacheId(input: {
  route: string;
  model: string;
  promptVersion: string;
  prompt: string;
}) {
  return createHash('sha256')
    .update(input.route)
    .update('\0')
    .update(input.model)
    .update('\0')
    .update(input.promptVersion)
    .update('\0')
    .update(input.prompt)
    .digest('hex');
}

export async function getSemanticCache(input: {
  route: string;
  model: string;
  promptVersion: string;
  prompt: string;
  threshold?: number;
}): Promise<string | null> {
  const config = getVectorConfig();
  if (!config) return null;

  try {
    const vector = await embed(input.prompt);
    const response = await fetch(`${config.url}/query/${CACHE_NAMESPACE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector,
        topK: 1,
        includeMetadata: true,
        includeData: true,
        filter: buildFilter(input),
      }),
    });

    if (!response.ok) {
      logger.warn('SemanticCache query failed', { status: response.status });
      return null;
    }

    const data = (await response.json()) as { result?: QueryResult[] };
    const match = data.result?.[0];
    const threshold = input.threshold ?? DEFAULT_THRESHOLD;

    if (!match || match.score < threshold || !match.data) {
      return null;
    }

    const expiresAt = match.metadata?.expiresAt ? new Date(match.metadata.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date()) {
      return null;
    }

    return match.data;
  } catch (error) {
    logger.warn('SemanticCache lookup skipped', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export async function setSemanticCache(input: {
  route: string;
  model: string;
  promptVersion: string;
  prompt: string;
  response: string;
  ttlMs?: number;
}): Promise<void> {
  const config = getVectorConfig();
  if (!config) return;

  try {
    const vector = await embed(input.prompt);
    const now = new Date();
    const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(now.getTime() + ttlMs);

    await fetch(`${config.url}/upsert/${CACHE_NAMESPACE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: cacheId(input),
        vector,
        data: input.response,
        metadata: {
          route: input.route,
          model: input.model,
          promptVersion: input.promptVersion,
          promptHash: cacheId(input),
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        } satisfies CacheMetadata,
      }),
    });
  } catch (error) {
    logger.warn('SemanticCache write skipped', { error: error instanceof Error ? error.message : String(error) });
  }
}
