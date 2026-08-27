// Creates a Stripe PaymentIntent for a "Boost" purchase (paid listing
// visibility — platform ad revenue, separate from marketplace transactions).
// Always uses Stripe regardless of STRIPE_CHECKOUT_ENABLED, which only gates
// the buyer/seller marketplace checkout path.
//
// Mirrors the structure/auth pattern of ../stripe-checkout/index.ts.
import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  errorResponse,
  getAuthUser,
  getSupabaseEnv,
  jsonResponse,
} from '../_shared/auth.ts';
import { stripeFetch } from '../_shared/stripe.ts';
import { BOOST_TIERS, findMatchingBoostTier, getBoostTier } from '../_shared/boost.ts';

interface Listing {
  id: string;
  seller_id: string;
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

    const body = await req.json();
    const { listingId, tierIndex, amountThb: bodyAmountThb } = body as {
      listingId?: string;
      tierIndex?: number;
      amountThb?: number;
    };

    if (!listingId || typeof listingId !== 'string') {
      return errorResponse('listingId is required', 400, headers);
    }

    // Validate the requested tier server-side against the shared BOOST_TIERS
    // list — never trust a client-supplied amount/duration pair. A caller
    // may pass either a tierIndex or an amountThb, but either way it must
    // resolve to an exact tier from the shared list.
    let tier = typeof tierIndex === 'number' ? getBoostTier(tierIndex) : undefined;
    if (!tier && typeof bodyAmountThb === 'number') {
      tier = BOOST_TIERS.find((t) => t.amountThb === bodyAmountThb);
    }
    if (!tier) {
      return errorResponse('Invalid boost tier', 400, headers);
    }
    // Defense in depth: re-validate the resolved tier is an exact match to
    // the canonical list (guards against future refactors accidentally
    // trusting a mutated object).
    if (!findMatchingBoostTier(tier.amountThb, tier.hours)) {
      return errorResponse('Invalid boost tier', 400, headers);
    }

    const admin = createServiceClient(env);

    const { data: listingRow, error: listingError } = await admin
      .from('listings')
      .select('id, seller_id')
      .eq('id', listingId)
      .single();
    if (listingError || !listingRow) {
      return errorResponse('Listing not found', 404, headers);
    }

    const listing = listingRow as Listing;
    if (listing.seller_id !== user.id) {
      return errorResponse('Forbidden', 403, headers);
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      return errorResponse('Payment provider not configured', 500, headers);
    }

    const amountSatang = Math.round(tier.amountThb * 100);

    const intent = await stripeFetch<{ id: string; client_secret: string | null }>(
      '/payment_intents',
      {
        method: 'POST',
        secretKey,
        body: {
          amount: amountSatang,
          currency: 'thb',
          'automatic_payment_methods[enabled]': 'true',
          'metadata[type]': 'boost',
          'metadata[listing_id]': listingId,
          'metadata[seller_id]': user.id,
          'metadata[duration_hours]': tier.hours,
        },
      }
    );

    const { error: insertError } = await admin.from('listing_boosts').insert({
      listing_id: listingId,
      seller_id: user.id,
      amount_thb: tier.amountThb,
      duration_hours: tier.hours,
      stripe_payment_intent_id: intent.id,
      status: 'pending',
    });

    if (insertError) {
      console.error('stripe-boost-checkout: failed to insert listing_boosts row', insertError.message);
      return errorResponse('Failed to record boost purchase', 500, headers);
    }

    return jsonResponse(
      { paymentIntentId: intent.id, clientSecret: intent.client_secret },
      200,
      headers
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('stripe-boost-checkout error:', message);
    return errorResponse(message, 500, headers);
  }
});
