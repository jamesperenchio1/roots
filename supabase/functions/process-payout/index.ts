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
  seller_payout_thb: number;
  status: string;
  payment_method: string;
  payout_status: string | null;
  payout_transfer_id: string | null;
  stripe_payment_intent_id: string | null;
  listing_id: string;
}

interface Profile {
  id: string;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean | null;
}

interface TransferResult {
  id: string;
  amount: number;
  status?: string;
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
    if (txError || !tx) return errorResponse('Transaction not found', 404, headers);
    const transaction = tx as Transaction;

    if (transaction.payment_method !== 'stripe' || !transaction.stripe_payment_intent_id) {
      return jsonResponse({ skipped: true, reason: 'direct_payment' }, 200, headers);
    }

    const { data: sellerProfile, error: profileError } = await admin
      .from('profiles')
      .select('id, stripe_account_id, stripe_onboarding_complete')
      .eq('id', transaction.seller_id)
      .single();
    if (profileError || !sellerProfile) {
      return errorResponse('Seller profile not found', 404, headers);
    }
    const seller = sellerProfile as Profile;

    // Allow buyer, seller, or admin to trigger payout.
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    const isAdmin = callerProfile?.is_admin === true;
    if (!isAdmin && user.id !== transaction.buyer_id && user.id !== transaction.seller_id) {
      return errorResponse('Forbidden', 403, headers);
    }

    if (transaction.status !== 'completed') {
      return errorResponse('Transaction must be completed before payout', 400, headers);
    }
    if (transaction.payout_status === 'transferred' && transaction.payout_transfer_id) {
      return jsonResponse({ success: true, transferId: transaction.payout_transfer_id }, 200, headers);
    }

    const sellerPayoutThb = transaction.seller_payout_thb ?? transaction.sale_price_thb;
    if (sellerPayoutThb <= 0) {
      await admin
        .from('transactions')
        .update({ payout_status: 'transferred' })
        .eq('id', orderId);
      return jsonResponse({ success: true, transferId: null }, 200, headers);
    }

    if (!seller.stripe_account_id || !seller.stripe_onboarding_complete) {
      await admin
        .from('transactions')
        .update({ payout_status: 'pending' })
        .eq('id', orderId);
      return errorResponse('Seller has no Stripe Connect account configured', 400, headers);
    }

    const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!secretKey) {
      return errorResponse('Payment provider not configured', 500, headers);
    }

    const amountSatang = Math.round(sellerPayoutThb * 100);

    const transferBody: Record<string, string> = {
      amount: String(amountSatang),
      currency: 'thb',
      destination: seller.stripe_account_id,
      transfer_group: orderId,
      idempotency_key: orderId,
    };
    // Anchor the transfer to the charge so it is guaranteed by available balance.
    if (transaction.stripe_payment_intent_id) {
      const intent = await stripeFetch<{ latest_charge: string | null }>(
        `/payment_intents/${transaction.stripe_payment_intent_id}`,
        { method: 'GET', secretKey }
      ).catch(() => ({ latest_charge: null }));
      if (intent?.latest_charge) {
        transferBody.source_transaction = intent.latest_charge;
      }
    }

    const transfer = await stripeFetch<TransferResult>('/transfers', {
      method: 'POST',
      secretKey,
      body: {
        ...transferBody,
        'metadata[order_id]': orderId,
        'metadata[listing_id]': transaction.listing_id,
      },
    });

    await admin
      .from('transactions')
      .update({
        payout_status: 'transferred',
        payout_transfer_id: transfer.id,
      })
      .eq('id', orderId);

    await admin.from('notifications').insert({
      user_id: transaction.seller_id,
      type: 'payout',
      title: 'Payout sent',
      message: `A payout of ฿${sellerPayoutThb.toLocaleString()} for order #${orderId.slice(-6)} has been transferred to your Stripe account.`,
      link: `/order/${orderId}`,
      read: false,
    }).catch((e: Error) => console.warn('process-payout: notification failed', e.message));

    return jsonResponse({ success: true, transferId: transfer.id }, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('process-payout error:', message);

    try {
      const body = await req.json().catch(() => ({}));
      if (body?.orderId) {
        const env = getSupabaseEnv();
        if (env) {
          const admin = createServiceClient(env);
          await admin
            .from('transactions')
            .update({ payout_status: 'failed' })
            .eq('id', body.orderId);
        }
      }
    } catch {
      // ignore
    }

    return errorResponse(message, 500, headers);
  }
});