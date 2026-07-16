import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. These must be set at runtime; do not commit credentials to source.'
    );
  }

  cachedClient = createBrowserClient(url, key);
  return cachedClient;
}

export const supabase = createSupabaseBrowserClient();
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const PHOTO_BUCKET = 'listing-photos';
