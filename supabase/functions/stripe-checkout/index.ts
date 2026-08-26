import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  errorResponse,
  getAuthUser,
  getSupabaseEnv,
  jsonResponse,
} from '../_shared/auth.ts';
import { stripeFetch } from '../_shared/stripe.ts';

interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  sale_price_thb: number;
  status: string;
  listing_id: string;
  stripe_payment_intent_id: string | null;
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

    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return errorResponse('orderId is required', 400, headers);
    }

    const admin = createServiceClient(env);

    const { data: tx, error: txError } = await admin
      .from('transactions')
      .select('*')
      .eq('id', orderId)
      .single();
    if (txError || !tx) {
      return errorResponse('Transaction not found', 404, headers);
    }

    const transaction = tx as Transaction;
    if (transaction.buyer_id !== user.id) {
      return errorResponse('Forbidden', 403, headers);
    }
    if (transaction.status !== 'pending_payment') {
      return errorResponse('Transaction is not awaiting payment', 400, headers);
    }

    // If an intent already exists for this order, return it (idempotent resume).
    if (transaction.stripe_payment_intent_id) {
      const existing = await stripeFetch<{ id: string; client_secret: string | null }>(
        `/payment_intents/${transaction.stripe_payment_intent_id}`,
        { method: 'GET', secretKey: Deno.env.get('STRIPE_SECRET_KEY') || '' }
      ).catch(() => null);
      if (existing?.client_secret) {
        return jsonResponse(
          { paymentIntentId: existing.id, clientSecret: existing.client_secret },
          200,
          headers
        );
      }
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      return errorResponse('Payment provider not configured', 500, headers);
    }

    const amountThb = Math.round(transaction.sale_price_thb * 100);

    const intent = await stripeFetch<{ id: string; client_secret: string | null }>(
      '/payment_intents',
      {
        method: 'POST',
        secretKey,
        body: {
          amount: amountThb,
          currency: 'thb',
          'automatic_payment_methods[enabled]': 'true',
          'metadata[order_id]': orderId,
          'metadata[listing_id]': transaction.listing_id,
          'metadata[buyer_id]': transaction.buyer_id,
          transfer_group: orderId,
          idempotency_key: orderId,
        },
      }
    );

    const { error: updateError } = await admin
      .from('transactions')
      .update({
        stripe_payment_intent_id: intent.id,
        payment_method: 'stripe',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('stripe-checkout: failed to store payment intent id', updateError.message);
      // The webhook will reconcile via metadata when the intent succeeds.
    }

    return jsonResponse(
      { paymentIntentId: intent.id, clientSecret: intent.client_secret },
      200,
      headers
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('stripe-checkout error:', message);
    return errorResponse(message, 500, headers);
  }
});