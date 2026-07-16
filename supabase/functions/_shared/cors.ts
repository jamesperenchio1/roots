/**
 * Shared CORS helper for Supabase Edge Functions.
 * Only origins listed in ALLOWED_ORIGINS (or the static default list) are permitted.
 * To allow local development, include `http://localhost:3000` in ALLOWED_ORIGINS.
 */

const DEFAULT_ORIGINS = [
  'https://roots-rho-two.vercel.app',
  'https://roots-pmshzr2wl-grandmatits69-1221s-projects.vercel.app',
];

function getAllowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS');
  if (env) return env.split(',').map((o) => o.trim()).filter(Boolean);
  return DEFAULT_ORIGINS;
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : getAllowedOrigins()[0] || '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Access-Control-Max-Age': '86400',
  };
}

export function preflightResponse(origin: string | null): Response {
  return new Response('ok', { status: 200, headers: corsHeaders(origin) });
}
