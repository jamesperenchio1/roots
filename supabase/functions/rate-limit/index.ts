import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { Ratelimit } from 'https://esm.sh/@upstash/ratelimit@1.2.1';
import { Redis } from 'https://esm.sh/@upstash/redis@1.34.0';
import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import { createServiceClient, errorResponse, getAuthUser, getSupabaseEnv, jsonResponse } from '../_shared/auth.ts';

const VALID_TYPES = ['message', 'upload', 'search'] as const;
type RateLimitType = typeof VALID_TYPES[number];

const LIMITERS: Record<RateLimitType, { limit: number; window: string }> = {
  message: { limit: 30, window: '1 m' },
  upload: { limit: 10, window: '10 m' },
  search: { limit: 20, window: '1 m' },
};

function getRedis(): Redis | null {
  const url = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflightResponse(origin);
  const headers = corsHeaders(origin);

  const env = getSupabaseEnv();
  if (!env) return errorResponse('Server misconfigured', 500, headers);

  const user = await getAuthUser(req, env);
  if (!user) return errorResponse('Unauthorized', 401, headers);

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, headers);

  let body: { type?: unknown; identifier?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON', 400, headers);
  }

  const type = body.type;
  const identifier = body.identifier;
  if (!VALID_TYPES.includes(type as RateLimitType) || typeof identifier !== 'string' || identifier.length === 0) {
    return errorResponse('Bad request', 400, headers);
  }

  const redis = getRedis();
  if (!redis) {
    // Redis not configured — allow through rather than block legitimate traffic.
    return jsonResponse({ ok: true, limit: 0, remaining: 0, reset: 0 }, 200, headers);
  }

  const config = LIMITERS[type as RateLimitType];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(config.limit, config.window),
    analytics: false,
  });

  try {
    const result = await limiter.limit(`${user.id}:${identifier}`);
    return jsonResponse(
      { ok: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset },
      200,
      headers
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('rate-limit error', message);
    return jsonResponse({ ok: true, limit: 0, remaining: 0, reset: 0 }, 200, headers);
  }
});
