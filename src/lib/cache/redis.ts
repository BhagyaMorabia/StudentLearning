/**
 * cache/redis.ts — Upstash Redis client + content caching helpers
 *
 * Primary use: cache AI teaching responses per subtopic.
 * 5,000 students learning "Magnetic Field of Toroid" = 1 Claude call, not 5,000.
 *
 * Falls back gracefully if Redis is not configured (dev without Upstash).
 */

import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    // Redis is optional — app works without it, just no caching
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set in production. Caching disabled.',
      );
    }
    return null;
  }

  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  return _redis;
}

/**
 * Get cached content by key.
 * Returns null if not found or if Redis is not configured.
 */
export async function getCachedContent<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch (err) {
    console.warn('[Redis] getCachedContent failed:', err);
    return null;
  }
}

/**
 * Set cached content with TTL.
 * Silently fails if Redis is not configured.
 *
 * @param key         Cache key (e.g., 'teach:subtopic-uuid')
 * @param value       JSON-serializable value
 * @param ttlSeconds  Time-to-live in seconds (default: 86400 = 24 hours)
 */
export async function setCachedContent<T>(
  key: string,
  value: T,
  ttlSeconds = 86400,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn('[Redis] setCachedContent failed:', err);
  }
}

/**
 * Invalidate a cache entry (e.g., when content is updated).
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    console.warn('[Redis] invalidateCache failed:', err);
  }
}
