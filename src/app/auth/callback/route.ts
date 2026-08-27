import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeRedirect } from '@/lib/navigation';

/**
 * OAuth callback Route Handler.
 *
 * Supabase's browser client uses the PKCE flow, which requires exchanging a
 * one-time `code` for a session. That exchange must happen exactly once and
 * must not happen from a page the user can refresh — otherwise a refresh
 * re-runs `detectSessionInUrl` client-side against the same (now-invalid)
 * code and the user gets signed out. Doing the exchange here, server-side,
 * means the `code`/`state` query params never reach a page the browser can
 * reload.
 */
async function handleCode(code: string | null, next: string, request: NextRequest) {
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeRedirect(searchParams.get('next'));
  return handleCode(code, next, request);
}

export async function POST(request: NextRequest) {
  // Apple's OAuth flow uses `response_mode: 'form_post'`, which POSTs the
  // code (and `next`, carried via the redirect URI's query string) instead
  // of a GET redirect.
  const { searchParams } = new URL(request.url);
  let code: string | null = null;
  try {
    const formData = await request.formData();
    code = (formData.get('code') as string | null) ?? null;
  } catch {
    // No/invalid body — fall through to the failure redirect below.
  }
  const next = sanitizeRedirect(searchParams.get('next'));
  return handleCode(code, next, request);
}
