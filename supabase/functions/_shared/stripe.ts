/**
 * Minimal shared helper for calling the Stripe REST API from Supabase Edge Functions.
 * Uses form-encoded POST bodies and Bearer auth, matching Stripe's public API.
 */

export async function stripeFetch<T = unknown>(
  path: string,
  {
    method = 'GET',
    body,
    secretKey,
  }: {
    method?: string;
    body?: Record<string, string | number | boolean | undefined | null>;
    secretKey: string;
  }
): Promise<T> {
  const params = new URLSearchParams();
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
  }

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method !== 'GET' && method !== 'HEAD' ? params.toString() : undefined,
  });

  const data = await res.json().catch(() => ({})) as T & { error?: { message?: string; code?: string }; object?: string };

  if (!res.ok) {
    const message = data.error?.message || res.statusText;
    throw new Error(`Stripe API error ${res.status}: ${message}`);
  }

  return data;
}

/**
 * Verify a Stripe webhook signature (Stripe-Signature: t=<ts>,v1=<sig>).
 * Computes HMAC-SHA256 over `${timestamp}.${rawBody}` and compares hex digests.
 */
export async function verifyStripeSignature(rawBody: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  const parts = sigHeader.split(',').map((p) => p.trim());
  let timestamp = '';
  let signature = '';
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') signature = value;
  }
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(signedPayload);

  // crypto.subtle is available in the Supabase Edge runtime (Deno).
  let hmac: ArrayBuffer;
  try {
    hmac = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then((key) => crypto.subtle.sign('HMAC', key, payloadData));
  } catch {
    return false;
  }

  const hex = Array.from(new Uint8Array(hmac), (b) => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

export function getStripeEnv() {
  return {
    secretKey: Deno.env.get('STRIPE_SECRET_KEY'),
    webhookSecret: Deno.env.get('STRIPE_WEBHOOK_SECRET'),
  };
}