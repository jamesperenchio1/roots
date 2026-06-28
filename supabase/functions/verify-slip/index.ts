// Verifies a buyer's payment slip against EasySlip, then auto-confirms the
// transaction when the amount matches and the slip is not a duplicate.
// Falls back to manual seller confirmation if EasySlip is not configured or fails.
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

    const { data: signed, error: signedError } = await admin
      .storage
      .from('payment-slips')
      .createSignedUrl(tx.payment_slip_path, 120);

    if (signedError || !signed?.signedUrl) {
      throw new Error('Could not create signed URL for the payment slip');
    }

    const apiKey = Deno.env.get('EASYSLIP_API_KEY');
    if (!apiKey) {
      console.warn('EASYSLIP_API_KEY not set; falling back to manual verification');
      return json({ status: 'manual' });
    }

    const easySlipRes = await fetch('https://api.easyslip.com/v2/verify/bank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: signed.signedUrl,
        matchAmount: expectedAmount,
        checkDuplicate: true,
      }),
    });

    const easySlipJson = await easySlipRes.json().catch(() => null);

    if (!easySlipRes.ok || !easySlipJson?.success) {
      const msg = easySlipJson?.error?.message || easySlipRes.statusText || 'EasySlip error';
      console.warn('EasySlip verify failed; falling back to manual', msg);
      return json({ status: 'manual', message: msg });
    }

    const amountMatched = easySlipJson.data?.isAmountMatched ?? true;
    const isDuplicate = easySlipJson.data?.isDuplicate ?? false;

    if (isDuplicate) {
      return json({ status: 'failed', message: 'This slip has already been used' });
    }

    if (!amountMatched) {
      return json({ status: 'failed', message: 'Slip amount does not match order total' });
    }

    const { error: updateError } = await admin
      .from('transactions')
      .update({
        payment_confirmed: true,
        status: 'paid_in_escrow',
        payment_confirmed_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (updateError) {
      throw updateError;
    }

    return json({ status: 'verified' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('verify-slip error:', message);
    return json({ status: 'manual', message });
  }
});

function json(body: VerifyResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
