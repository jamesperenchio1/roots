import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  if (!SUPABASE_URL_ENV || !SUPABASE_KEY_ENV) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. These must be set at runtime; do not commit credentials to source.'
    );
  }
  cachedClient = createBrowserClient(SUPABASE_URL_ENV, SUPABASE_KEY_ENV);
  return cachedClient;
}

export const supabase: SupabaseClient = SUPABASE_URL_ENV && SUPABASE_KEY_ENV
  ? createBrowserClient(SUPABASE_URL_ENV, SUPABASE_KEY_ENV)
  : (null as unknown as SupabaseClient);
export const SUPABASE_URL = SUPABASE_URL_ENV ?? '';
export const PHOTO_BUCKET = 'listing-photos';
