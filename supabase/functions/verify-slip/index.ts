import { corsHeaders } from '../_shared/cors.ts';

// ─── SlipOK Provider ─────────────────────────────────────────────────────────

interface SlipOKResult {
  valid: boolean;
  data: SlipData;
}

interface SlipData {
  amount?: number;
  amountString?: string;
  transRef?: string;
  transDate?: string;
  transTime?: string;
  sender?: { displayName?: string; name?: string; proxy?: { type?: string; value?: string } };
  receiver?: { displayName?: string; name?: string; proxy?: { type?: string; value?: string } };
  sendingBank?: string;
  receivingBank?: string;
}

async function inquirySlipOK(
  branchId: string,
  apiKey: string,
  payload: string
): Promise<SlipOKResult> {
  const res = await fetch(`https://api.slipok.com/api/line/apikey/${branchId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-authorization': apiKey,
    },
    body: JSON.stringify({ data: payload }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`SlipOK API error: ${res.status} ${JSON.stringify(data)}`);
  }

  const d = data.data || {};
  const amount = d.amount ? parseFloat(String(d.amount)) : undefined;

  return {
    valid: d.success === true,
    data: {
      amount,
      amountString: d.amount,
      transRef: d.transRef || d.trans_ref,
      transDate: d.transDate || d.trans_date,
      transTime: d.transTime || d.trans_time,
      sender: d.sender,
      receiver: d.receiver,
      sendingBank: d.sendingBank || d.sending_bank,
      receivingBank: d.receivingBank || d.receiving_bank,
    },
  };
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { payload, expectedAmount, expectedRecipient } = body;

    if (!payload || typeof payload !== 'string') {
      return new Response(
        JSON.stringify({ error_type: 'invalid_qr', error: 'Missing or invalid payload (QR code string required)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const branchId = Deno.env.get('SLIPOK_BRANCH_ID') || '';
    const apiKey = Deno.env.get('SLIPOK_API_KEY') || '';

    if (!branchId || !apiKey) {
      return new Response(
        JSON.stringify({ error_type: 'slipok_down', error: 'SlipOK not configured. Set SLIPOK_BRANCH_ID and SLIPOK_API_KEY.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await inquirySlipOK(branchId, apiKey, payload);
    const details = result.data;

    // ── Validation ─────────────────────────────────────────────────────────
    const errors: string[] = [];
    const warnings: string[] = [];

    // Amount check (allow ±1 THB for rounding)
    if (expectedAmount !== undefined && expectedAmount !== null) {
      const actual = details.amount;
      if (actual === undefined) {
        warnings.push('Could not verify amount from slip');
      } else if (Math.abs(actual - expectedAmount) > 1) {
        errors.push(
          `Amount mismatch: expected ${expectedAmount.toLocaleString()} THB, got ${actual.toLocaleString()} THB`
        );
      }
    }

    // Recipient check (normalize to digits only for comparison)
    if (expectedRecipient && expectedRecipient.trim()) {
      const rcv = details.receiver;
      const rcvValue = rcv?.proxy?.value || rcv?.name || '';
      const normalizedExpected = expectedRecipient.replace(/\D/g, '');
      const normalizedActual = String(rcvValue).replace(/\D/g, '');

      if (!rcvValue) {
        warnings.push('Could not verify recipient from slip');
      } else if (normalizedExpected && normalizedActual && normalizedExpected !== normalizedActual) {
        errors.push('Recipient mismatch: payment was not sent to the expected account');
      }
    }

    const verified = result.valid && errors.length === 0;

    return new Response(
      JSON.stringify({
        verified,
        valid: result.valid,
        provider: 'slipok',
        errors,
        warnings,
        details: {
          amount: details.amount,
          transRef: details.transRef,
          transDate: details.transDate,
          transTime: details.transTime,
          senderName: details.sender?.displayName || details.sender?.name,
          receiverName: details.receiver?.displayName || details.receiver?.name,
          receiverProxy: details.receiver?.proxy,
          sendingBank: details.sendingBank,
          receivingBank: details.receivingBank,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('verify-slip error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
