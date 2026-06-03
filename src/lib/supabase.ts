import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// The anon/publishable key is designed to be public — access is gated by
// Postgres Row Level Security. We fall back to the project defaults so the
// deployed build always works even if env vars are not wired.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://daacilgagkphafpjdcte.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_pfQ_kyf47PV-p_E2fDG3wQ__5MaWnsZ';

// Warn if using fallback credentials in production-like environments
if (import.meta.env.PROD && !import.meta.env.VITE_SUPABASE_URL) {
  logger.warn('Using fallback Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const PHOTO_BUCKET = 'listing-photos';
