import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import { errorResponse, jsonResponse } from '../_shared/auth.ts';

const CORS_HEADERS = corsHeaders(null);

type VerifyStatus = 'verified' | 'failed' | 'manual';

interface VerifyResponse {
  status: VerifyStatus;
  message?: string;
}

interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  payment_slip_path: string | null;
  payment_confirmed: boolean;
  sale_price_thb: number | null;
  shipping_cost_thb: number | null;
  payment_trans_ref?: string | null;
}

async function getAuthUser(req: Request, supabaseUrl: string, serviceRoleKey: string): Promise<User | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflightResponse(origin);
  const headers = corsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Server misconfigured');
    }

    const user = await getAuthUser(req, supabaseUrl, serviceRoleKey);
    if (!user) return errorResponse('Unauthorized', 401, headers);

    const { transactionId } = await req.json();
    if (!transactionId || typeof transactionId !== 'string') {
      return errorResponse('transactionId is required', 400, headers);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: tx, error: txError } = await admin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !tx) {
      return errorResponse('Transaction not found', 404, headers);
    }

    const transaction = tx as Transaction;

    // Only the buyer or seller may trigger slip verification.
    if (transaction.buyer_id !== user.id && transaction.seller_id !== user.id) {
      return errorResponse('Forbidden', 403, headers);
    }

    if (!transaction.payment_slip_path) {
      return errorResponse('No payment slip uploaded for this transaction', 400, headers);
    }

    if (transaction.payment_confirmed) {
      return jsonResponse({ status: 'verified', message: 'Payment already confirmed' } as VerifyResponse, 200, headers);
    }

    const expectedAmount = (Number(transaction.sale_price_thb) || 0) + (Number(transaction.shipping_cost_thb) || 0);
    if (expectedAmount <= 0) {
      return errorResponse('Invalid transaction amount', 400, headers);
    }

    const apiKey = Deno.env.get('SLIPOK_API_KEY');
    const branchId = Deno.env.get('SLIPOK_BRANCH_ID');
    if (!apiKey || !branchId) {
      console.warn('SLIPOK_API_KEY or SLIPOK_BRANCH_ID not set; falling back to manual verification');
      return jsonResponse({ status: 'manual' } as VerifyResponse, 200, headers);
    }

    const { data: blob, error: dlError } = await admin
      .storage
      .from('payment-slips')
      .download(transaction.payment_slip_path);

    if (dlError || !blob) {
      return errorResponse('Could not download the payment slip', 500, headers);
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    const slipOkRes = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
      method: 'POST',
      headers: {
        'x-authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: base64,
        amount: expectedAmount,
        log: false,
      }),
    });

    const slipOkJson = await slipOkRes.json().catch(() => null);

    if (!slipOkRes.ok || !slipOkJson?.success) {
      const code = slipOkJson?.code;
      const message = slipOkJson?.message || slipOkRes.statusText || 'SlipOK error';

      if (code === 1013) {
        return jsonResponse({ status: 'failed', message: 'Slip amount does not match order total' } as VerifyResponse, 200, headers);
      }

      if (code === 1011) {
        return jsonResponse({ status: 'failed', message: 'QR code expired or transaction not found' } as VerifyResponse, 200, headers);
      }

      if (code === 1009 || code === 1010) {
        console.warn('SlipOK temporary/delay error; falling back to manual', message);
        return jsonResponse({ status: 'manual', message } as VerifyResponse, 200, headers);
      }

      console.warn('SlipOK verify failed; falling back to manual', message);
      return jsonResponse({ status: 'manual', message } as VerifyResponse, 200, headers);
    }

    const slipData = slipOkJson.data;
    const slipAmount = Number(slipData?.amount);
    const transRef = String(slipData?.transRef || '');

    if (Number.isNaN(slipAmount) || Math.abs(slipAmount - expectedAmount) > 0.01) {
      return jsonResponse({ status: 'failed', message: 'Slip amount does not match order total' } as VerifyResponse, 200, headers);
    }

    if (!transRef) {
      return jsonResponse({ status: 'manual', message: 'Could not read transaction reference from slip' } as VerifyResponse, 200, headers);
    }

    try {
      const { data: existing, error: dupError } = await admin
        .from('transactions')
        .select('id')
        .eq('payment_trans_ref', transRef)
        .neq('id', transactionId)
        .maybeSingle();

      if (dupError) {
        console.warn('Duplicate-check query failed', dupError.message);
      } else if (existing) {
        return jsonResponse({ status: 'failed', message: 'This slip has already been used' } as VerifyResponse, 200, headers);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Duplicate-check threw; skipping', msg);
    }

    const updatePayload: Record<string, unknown> = {
      payment_confirmed: true,
      status: 'paid_in_escrow',
      payment_confirmed_at: new Date().toISOString(),
    };

    updatePayload.payment_trans_ref = transRef;
    const { error: updateError } = await admin
      .from('transactions')
      .update(updatePayload)
      .eq('id', transactionId);

    if (updateError) {
      if (updateError.message?.includes('payment_trans_ref')) {
        delete updatePayload.payment_trans_ref;
        const { error: retryError } = await admin
          .from('transactions')
          .update(updatePayload)
          .eq('id', transactionId);
        if (retryError) throw retryError;
      } else {
        throw updateError;
      }
    }

    return jsonResponse({ status: 'verified' } as VerifyResponse, 200, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('verify-slip error:', message);
    return jsonResponse({ status: 'manual', message: 'Verification could not be completed' } as VerifyResponse, 200, headers);
  }
});

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1024) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 1024));
  }
  return btoa(binary);
}
