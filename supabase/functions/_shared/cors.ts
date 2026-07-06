/**
 * Shared CORS helper for Supabase Edge Functions.
 * Allows the configured production origin(s) plus localhost for local dev.
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
  return allowed.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
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
