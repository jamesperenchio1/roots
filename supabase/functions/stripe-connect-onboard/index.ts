import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  errorResponse,
  getAuthUser,
  getSupabaseEnv,
  jsonResponse,
} from '../_shared/auth.ts';
import { stripeFetch } from '../_shared/stripe.ts';

interface Profile {
  id: string;
  email?: string;
  display_name?: string;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean | null;
}

interface StripeAccount {
  id: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
}

interface AccountLink {
  url: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflightResponse(origin);
  const headers = corsHeaders(origin);

  try {
    const env = getSupabaseEnv();
    if (!env) throw new Error('Server misconfigured');

    const user = await getAuthUser(req, env);
    if (!user) return errorResponse('Unauthorized', 401, headers);

    const { refreshUrl, returnUrl } = await req.json().catch(() => ({}));
    const appUrl = Deno.env.get('APP_URL') || 'https://roots-rho-two.vercel.app';
    const refresh = typeof refreshUrl === 'string' && refreshUrl ? refreshUrl : `${appUrl}/seller-dashboard/payouts`;
    const ret = typeof returnUrl === 'string' && returnUrl ? returnUrl : `${appUrl}/seller-dashboard/payouts?onboarded=1`;

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      return errorResponse('Payment provider not configured', 500, headers);
    }

    const admin = createServiceClient(env);

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, display_name, stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return errorResponse('Profile not found', 404, headers);
    }
    const me = profile as Profile;

    // Reuse an existing Express account if present.
    let accountId = me.stripe_account_id;
    if (!accountId) {
      const account = await stripeFetch<StripeAccount>('/accounts', {
        method: 'POST',
        secretKey,
        body: {
          type: 'express',
          country: 'TH',
          email: me.email || '',
          'capabilities[transfers][requested]': 'true',
          'capabilities[card_payments][requested]': 'true',
        },
      });
      accountId = account.id;

      await admin
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', user.id);
    }

    const link = await stripeFetch<AccountLink>('/account_links', {
      method: 'POST',
      secretKey,
      body: {
        account: accountId,
        refresh_url: refresh,
        return_url: ret,
        type: 'account_onboarding',
      },
    });

    await admin
      .from('profiles')
      .update({ stripe_onboarding_complete: true })
      .eq('id', user.id);

    return jsonResponse({ url: link.url, accountId }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('stripe-connect-onboard error:', message);
    return errorResponse(message, 500, headers);
  }
});