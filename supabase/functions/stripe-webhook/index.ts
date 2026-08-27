import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import { createServiceClient, errorResponse, getSupabaseEnv, jsonResponse } from '../_shared/auth.ts';
import { verifyStripeSignature } from '../_shared/stripe.ts';

interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  sale_price_thb: number;
  status: string;
  stripe_payment_intent_id: string | null;
}

interface ListingBoost {
  id: string;
  listing_id: string;
  seller_id: string;
  duration_hours: number;
  status: string;
  stripe_payment_intent_id: string;
}

interface StripeEvent {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      status?: string;
      amount?: number;
      metadata?: {
        order_id?: string;
        listing_id?: string;
        buyer_id?: string;
        type?: string;
        seller_id?: string;
        duration_hours?: string;
      };
      charges?: { data?: Array<{ id?: string; amount?: number; fee_details?: Array<{ amount?: number; type?: string }> }> };
      latest_charge?: string;
    };
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflightResponse(origin);
  const headers = corsHeaders(origin);

  try {
    const env = getSupabaseEnv();
    if (!env) throw new Error('Server misconfigured');

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('stripe-webhook: STRIPE_WEBHOOK_SECRET not set');
      return jsonResponse({ received: true }, 200, headers);
    }

    const rawBody = await req.text();
    const sigHeader = req.headers.get('stripe-signature');
    const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!valid) {
      console.error('stripe-webhook: signature verification failed');
      return errorResponse('Invalid signature', 401, headers);
    }

    const event = (JSON.parse(rawBody) as StripeEvent);
    const eventType = event.type;
    const pi = event.data?.object;

    console.log('stripe-webhook received', eventType, pi?.id);

    const admin = createServiceClient(env);

    if (eventType === 'payment_intent.succeeded') {
      const intentId = pi?.id;
      if (!intentId) {
        return jsonResponse({ received: true }, 200, headers);
      }

      // Boost purchases (platform ad revenue) branch entirely away from the
      // order/transaction escrow path below — a boost PaymentIntent never
      // has an order_id, and vice versa.
      if (pi?.metadata?.type === 'boost') {
        const { data: boostRow, error: boostError } = await admin
          .from('listing_boosts')
          .select('*')
          .eq('stripe_payment_intent_id', intentId)
          .maybeSingle();

        if (boostError || !boostRow) {
          console.warn('stripe-webhook: listing_boosts row not found for intent', intentId);
          return jsonResponse({ received: true }, 200, headers);
        }

        const boost = boostRow as ListingBoost;
        // Idempotent: webhook retries must not double-extend the boost.
        if (boost.status === 'succeeded') {
          return jsonResponse({ received: true }, 200, headers);
        }

        const { error: boostUpdateError } = await admin
          .from('listing_boosts')
          .update({ status: 'succeeded', updated_at: new Date().toISOString() })
          .eq('id', boost.id);
        if (boostUpdateError) {
          console.error('stripe-webhook: listing_boosts update failed', boostUpdateError.message);
          return jsonResponse({ received: true }, 200, headers);
        }

        const { data: listingRow, error: listingError } = await admin
          .from('listings')
          .select('boosted_until')
          .eq('id', boost.listing_id)
          .maybeSingle();
        if (listingError || !listingRow) {
          console.warn('stripe-webhook: listing not found for boost', boost.listing_id);
          return jsonResponse({ received: true }, 200, headers);
        }

        const now = new Date();
        const currentBoostedUntil = listingRow.boosted_until
          ? new Date(listingRow.boosted_until as string)
          : null;
        // Stack additively on top of remaining time rather than resetting
        // from now, so a seller stacking boosts doesn't waste overlap.
        const base = currentBoostedUntil && currentBoostedUntil > now ? currentBoostedUntil : now;
        const newBoostedUntil = new Date(base.getTime() + boost.duration_hours * 60 * 60 * 1000);

        const { error: listingUpdateError } = await admin
          .from('listings')
          .update({ boosted_until: newBoostedUntil.toISOString() })
          .eq('id', boost.listing_id);
        if (listingUpdateError) {
          console.error('stripe-webhook: listings boosted_until update failed', listingUpdateError.message);
        }

        return jsonResponse({ received: true }, 200, headers);
      }

      const orderIdFromMeta = pi?.metadata?.order_id;

      const { data: tx, error: txError } = await admin
        .from('transactions')
        .select('*')
        .or(`stripe_payment_intent_id.eq.${intentId},id.eq.${orderIdFromMeta || '00000000-0000-0000-0000-000000000000'}`)
        .maybeSingle();

      if (txError || !tx) {
        console.warn('stripe-webhook: transaction not found for intent', intentId);
        return jsonResponse({ received: true }, 200, headers);
      }

      const transaction = tx as Transaction;
      if (transaction.status !== 'pending_payment') {
        return jsonResponse({ received: true }, 200, headers);
      }

      const expectedAmount = Math.round(transaction.sale_price_thb * 100);
      const paidAmount = pi?.amount;
      if (paidAmount !== undefined && paidAmount !== expectedAmount) {
        console.warn('stripe-webhook: amount mismatch', paidAmount, expectedAmount);
        return jsonResponse({ received: true }, 200, headers);
      }

      const gatewayFeeThb = Math.round(
        (pi?.charges?.data?.[0]?.fee_details || [])
          .reduce((s, f) => s + (f.amount || 0), 0) / 100
      );

      const confirmedAt = new Date().toISOString();
      const { error: updateError } = await admin
        .from('transactions')
        .update({
          status: 'paid_in_escrow',
          payment_confirmed: true,
          payment_confirmed_at: confirmedAt,
          payment_gateway_fee_thb: gatewayFeeThb,
          stripe_payment_intent_id: intentId,
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('stripe-webhook: update failed', updateError.message);
        return jsonResponse({ received: true }, 200, headers);
      }

      // Notify the seller.
      await admin.from('notifications').insert({
        user_id: transaction.seller_id,
        type: 'order',
        title: 'Payment confirmed',
        message: `Payment for order #${transaction.id.slice(-6)} was confirmed. You can now ship the plant.`,
        link: `/order/${transaction.id}`,
        read: false,
      }).catch((e: Error) => console.warn('stripe-webhook: seller notification failed', e.message));
    }

    if (eventType === 'payment_intent.payment_failed' || eventType === 'payment_intent.canceled') {
      const intentId = pi?.id;
      if (!intentId) {
        return jsonResponse({ received: true }, 200, headers);
      }

      if (pi?.metadata?.type === 'boost') {
        const { data: boostRow, error: boostError } = await admin
          .from('listing_boosts')
          .select('id, status')
          .eq('stripe_payment_intent_id', intentId)
          .maybeSingle();
        if (boostError || !boostRow) {
          return jsonResponse({ received: true }, 200, headers);
        }
        const boost = boostRow as ListingBoost;
        if (boost.status === 'pending') {
          await admin
            .from('listing_boosts')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', boost.id);
        }
        return jsonResponse({ received: true }, 200, headers);
      }

      const { data: tx, error: txError } = await admin
        .from('transactions')
        .select('*')
        .eq('stripe_payment_intent_id', intentId)
        .maybeSingle();

      if (txError || !tx) {
        return jsonResponse({ received: true }, 200, headers);
      }

      const transaction = tx as Transaction;
      if (transaction.status !== 'pending_payment') {
        return jsonResponse({ received: true }, 200, headers);
      }

      await admin.from('transactions').update({ status: 'cancelled' }).eq('id', transaction.id);
      await admin.from('listings').update({ status: 'active' }).eq('id', transaction.listing_id);

      await admin.from('notifications').insert({
        user_id: transaction.buyer_id,
        type: 'order',
        title: 'Payment failed',
        message: `Your payment for order #${transaction.id.slice(-6)} failed or was cancelled. The item has been returned to the marketplace.`,
        link: `/listing/${transaction.listing_id}`,
        read: false,
      }).catch((e: Error) => console.warn('stripe-webhook: buyer notification failed', e.message));
    }

    return jsonResponse({ received: true }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('stripe-webhook error:', message);
    // Always return 200 so Stripe does not retry and DOS us.
    return jsonResponse({ received: true }, 200, headers);
  }
});