import { logger } from './logger';
import { supabase } from './supabase/client';

export type RateLimitType = 'message' | 'upload' | 'search';

const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/rate-limit`;

export async function checkRateLimit(
  type: RateLimitType,
  identifier: string
): Promise<{ ok: boolean; limit?: number; remaining?: number; reset?: number }> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      // Not logged in — allow (auth routes already gate functionality).
      return { ok: true };
    }

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ type, identifier }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn('rate-limit function returned non-ok', { status: res.status, text });
      return { ok: true };
    }

    return (await res.json()) as { ok: boolean; limit?: number; remaining?: number; reset?: number };
  } catch (e) {
    logger.warn('rate-limit check failed', { error: e instanceof Error ? e.message : String(e) });
    return { ok: true };
  }
}
