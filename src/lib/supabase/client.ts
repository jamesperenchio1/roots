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

/**
 * Whether the Supabase browser client can be constructed. Consumers that may
 * render before configuration is present (or on a build where the public env
 * vars were not inlined) should check this instead of dereferencing `supabase`.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL_ENV && SUPABASE_KEY_ENV);

/**
 * Lazily-constructed Supabase browser client.
 *
 * Historically this export fell back to `null` when the public env vars were
 * missing, which surfaced as an opaque `Cannot read properties of null
 * (reading 'auth')` deep inside auth code and blanked the whole app via the
 * global error boundary. Instead of returning a silent `null`, touching this
 * proxy now throws one explicit, actionable error.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createSupabaseBrowserClient()
  : (new Proxy(
      {},
      {
        get(_target, prop) {
          // Let symbol access (inspection, iteration, coercion) behave normally
          // so the proxy cannot throw from unexpected places; only real API
          // access raises the actionable error.
          if (typeof prop === 'symbol') return undefined;
          throw new Error(
            'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set at build time. Add them to your environment and redeploy.'
          );
        },
      }
    ) as unknown as SupabaseClient);

export const SUPABASE_URL = SUPABASE_URL_ENV ?? '';
export const PHOTO_BUCKET = 'listing-photos';
