/**
 * rate-limit/index.ts — Per-route rate limiting via Upstash Ratelimit
 *
 * Limits are per authenticated user (Clerk userId as the key).
 * Falls back gracefully (allows request) if Redis is not configured.
 *
 * Configured limits (sliding window):
 *   teach:  30 requests per hour    — AI teaching, expensive
 *   quiz:   5  requests per minute  — Quiz generation
 *   doubt:  20 requests per hour    — Socratic chat
 *   submit: 60 requests per minute  — Quiz submission (cheap, DB only)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

// Lazy-initialize limiters only if Redis is available
const getLimiter = (() => {
  const cache = new Map<string, Ratelimit>();

  return (type: string, limit: number, window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`): Ratelimit | null => {
    const r = getRedis();
    if (!r) return null;

    if (!cache.has(type)) {
      cache.set(
        type,
        new Ratelimit({
          redis: r,
          limiter: Ratelimit.slidingWindow(limit, window),
          prefix: `neuraljee:rl:${type}`,
        }),
      );
    }

    return cache.get(type)!;
  };
})();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // Unix timestamp when the window resets
}

/**
 * Check rate limit for a specific route type.
 * Always returns success: true if Redis is not configured (dev mode).
 *
 * @param type    Route type key: 'teach' | 'quiz' | 'doubt' | 'submit'
 * @param userId  Clerk userId to scope the limit per user
 */
export async function checkRateLimit(
  type: 'teach' | 'quiz' | 'doubt' | 'submit',
  userId: string,
): Promise<RateLimitResult> {
  const limitConfig: Record<string, [number, `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`]> = {
    teach:  [30, '1 h'],
    quiz:   [5,  '1 m'],
    doubt:  [20, '1 h'],
    submit: [60, '1 m'],
  };

  const [limit, window] = limitConfig[type];
  const limiter = getLimiter(type, limit, window);

  // Graceful fallback: no Redis = no rate limiting (dev/test)
  if (!limiter) {
    return { success: true, remaining: 999, reset: 0 };
  }

  try {
    const result = await limiter.limit(`${type}:${userId}`);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.warn('[RateLimit] Check failed, allowing request:', err);
    return { success: true, remaining: 999, reset: 0 };
  }
}
