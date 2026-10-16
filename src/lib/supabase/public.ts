import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Anonymous, cookie-free Supabase client for server-side reads of public data.
 * Because it never touches `cookies()`, pages that use it stay statically
 * renderable and ISR (`export const revalidate`) actually takes effect.
 */
export function createSupabasePublicClient(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
