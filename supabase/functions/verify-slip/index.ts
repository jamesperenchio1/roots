// Verifies a buyer's payment slip against SlipOK, then auto-confirms the
// transaction when the amount matches and the slip has not been used before.
// Falls back to manual seller confirmation if SlipOK is not configured or fails.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VerifyStatus = 'verified' | 'failed' | 'manual';

interface VerifyResponse {
  status: VerifyStatus;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { transactionId } = await req.json();
    if (!transactionId || typeof transactionId !== 'string') {
      throw new Error('transactionId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const apiKey = Deno.env.get('SLIPOK_API_KEY');
    const branchId = Deno.env.get('SLIPOK_BRANCH_ID');
    if (!apiKey || !branchId) {
      console.warn('SLIPOK_API_KEY or SLIPOK_BRANCH_ID not set; falling back to manual verification');
      return json({ status: 'manual' });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: tx, error: txError } = await admin
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !tx) {
      throw new Error('Transaction not found');
    }

    if (!tx.payment_slip_path) {
      throw new Error('No payment slip uploaded for this transaction');
    }

    if (tx.payment_confirmed) {
      return json({ status: 'verified', message: 'Payment already confirmed' });
    }

    const expectedAmount = (Number(tx.sale_price_thb) || 0) + (Number(tx.shipping_cost_thb) || 0);
    if (expectedAmount <= 0) {
      throw new Error('Invalid transaction amount');
    }

    const { data: blob, error: dlError } = await admin
      .storage
      .from('payment-slips')
      .download(tx.payment_slip_path);

    if (dlError || !blob) {
      throw new Error('Could not download the payment slip');
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
        return json({ status: 'failed', message: 'Slip amount does not match order total' });
      }

      if (code === 1011) {
        return json({ status: 'failed', message: 'QR code expired or transaction not found' });
      }

      if (code === 1009 || code === 1010) {
        console.warn('SlipOK temporary/delay error; falling back to manual', message);
        return json({ status: 'manual', message });
      }

      console.warn('SlipOK verify failed; falling back to manual', message);
      return json({ status: 'manual', message });
    }

    const slipData = slipOkJson.data;
    const slipAmount = Number(slipData?.amount);
    const transRef = String(slipData?.transRef || '');

    if (Number.isNaN(slipAmount) || Math.abs(slipAmount - expectedAmount) > 0.01) {
      return json({ status: 'failed', message: 'Slip amount does not match order total' });
    }

    if (!transRef) {
      return json({ status: 'manual', message: 'Could not read transaction reference from slip' });
    }

    // Local duplicate check: another order already used this transRef.
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
        return json({ status: 'failed', message: 'This slip has already been used' });
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

    try {
      updatePayload.payment_trans_ref = transRef;
      const { error: updateError } = await admin
        .from('transactions')
        .update(updatePayload)
        .eq('id', transactionId);

      if (updateError) {
        // If payment_trans_ref column does not exist yet, retry without it.
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
    } catch (e) {
      throw e;
    }

    return json({ status: 'verified' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('verify-slip error:', message);
    return json({ status: 'manual', message });
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

function json(body: VerifyResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
