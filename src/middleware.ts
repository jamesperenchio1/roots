import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeRedirect } from '@/lib/navigation';

/** Routes that need a signed-in user. Matched on a path-segment boundary. */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/seller-dashboard',
  '/messages',
  '/checkout',
  '/order',
  '/admin',
];

/** Routes a signed-in user has no reason to see. */
const AUTH_ONLY_ROUTES = ['/login', '/signup', '/forgot-password'];

const matchesRoute = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() validates the JWT locally when the project signs with asymmetric keys
  // (no round trip to Supabase Auth) and also refreshes the session cookie when needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;
  const { pathname, search } = request.nextUrl;

  if (!signedIn && PROTECTED_ROUTES.some((r) => matchesRoute(pathname, r))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(url);
  }

  if (signedIn && AUTH_ONLY_ROUTES.some((r) => matchesRoute(pathname, r))) {
    const url = request.nextUrl.clone();
    const target = sanitizeRedirect(request.nextUrl.searchParams.get('redirect'), '/');
    const resolved = new URL(target, request.nextUrl.origin);
    url.pathname = resolved.pathname;
    url.search = resolved.search;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Only run where auth state matters. Public pages (browse, listings, species, static assets)
// skip the middleware entirely, so they stay cacheable and pay no auth cost.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/seller-dashboard/:path*',
    '/messages/:path*',
    '/checkout/:path*',
    '/order/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
    '/forgot-password',
  ],
};
