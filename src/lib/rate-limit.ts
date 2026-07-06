import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { logger } from './logger';

const redisUrl = import.meta.env.VITE_UPSTASH_REDIS_REST_URL as string | undefined;
const redisToken = import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN as string | undefined;

function getRedis(): Redis | null {
  if (!redisUrl || !redisToken) return null;
  try {
    return new Redis({ url: redisUrl, token: redisToken });
  } catch (e) {
    logger.warn('Redis init failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

const redis = getRedis();

const messageLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(30, '1 m'), analytics: false })
  : null;

const uploadLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(10, '10 m'), analytics: false })
  : null;

const searchLimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(20, '1 m'), analytics: false })
  : null;

export type RateLimitType = 'message' | 'upload' | 'search';

const limiters: Record<RateLimitType, Ratelimit | null> = {
  message: messageLimit,
  upload: uploadLimit,
  search: searchLimit,
};

export async function checkRateLimit(type: RateLimitType, identifier: string): Promise<{ ok: boolean; limit?: number; remaining?: number; reset?: number }> {
  const limiter = limiters[type];
  if (!limiter) {
    // No Redis configured — allow through.
    return { ok: true };
  }
  try {
    const result = await limiter.limit(identifier);
    return { ok: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset };
  } catch (e) {
    logger.warn('rate limit check failed', { error: e instanceof Error ? e.message : String(e) });
    return { ok: true };
  }
}
