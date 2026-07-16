import { corsHeaders, isAllowedOrigin, preflightResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  errorResponse,
  getSupabaseEnv,
  jsonResponse,
} from '../_shared/auth.ts';

interface ContactSubmissionPayload {
  name?: unknown;
  email?: unknown;
  topic?: unknown;
  message?: unknown;
  userId?: unknown;
}

const MAX_MESSAGE_LENGTH = 5000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_TOPIC_LENGTH = 100;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflightResponse(origin);
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, corsHeaders(origin));
  if (!isAllowedOrigin(origin)) return errorResponse('Origin not allowed', 403, corsHeaders(origin));

  const headers = corsHeaders(origin);
  const env = getSupabaseEnv();
  if (!env) return errorResponse('Server misconfigured', 500, headers);

  let body: ContactSubmissionPayload = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON', 400, headers);
  }

  const name = typeof body.name === 'string' ? sanitizeText(body.name, MAX_NAME_LENGTH) : '';
  const email = typeof body.email === 'string' ? sanitizeText(body.email, MAX_EMAIL_LENGTH).toLowerCase() : '';
  const topic = typeof body.topic === 'string' ? sanitizeText(body.topic, MAX_TOPIC_LENGTH) : '';
  const message = typeof body.message === 'string' ? sanitizeText(body.message, MAX_MESSAGE_LENGTH) : '';
  const userId = typeof body.userId === 'string' && body.userId.length > 0 ? body.userId : null;

  if (!name || !email || !isValidEmail(email) || !topic || !message) {
    return errorResponse('Missing or invalid fields', 400, headers);
  }

  const supabase = createServiceClient(env);

  // Persist the submission before attempting to send email so support has an audit trail.
  const { error: insertError } = await supabase
    .from('contact_submissions')
    .insert({
      name,
      email,
      topic,
      message,
      user_id: userId,
      metadata: { source: 'web', origin, user_agent: req.headers.get('user-agent') },
    });

  if (insertError) {
    console.error('contact submission insert failed', insertError.message);
    return errorResponse('Unable to save submission', 500, headers);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY') || Deno.env.get('EMAIL_PROVIDER_API_KEY');
  const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') || Deno.env.get('EMAIL_FROM') || 'noreply@rootplantmarket.com';
  const toAddress = Deno.env.get('RESEND_TO_EMAIL') || Deno.env.get('EMAIL_TO');

  if (resendApiKey && toAddress) {
    const subject = `Roots contact: ${topic}`;
    const text = `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}\n\n---\nSubmitted from ${origin || 'unknown origin'}`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromAddress, to: toAddress, reply_to: email, subject, text }),
      });
      if (!res.ok) {
        const textBody = await res.text().catch(() => '');
        console.error('resend contact send failed', res.status, textBody);
        // We already persisted the submission, so the user can still be told it was received.
      }
    } catch (e) {
      const messageText = e instanceof Error ? e.message : String(e);
      console.error('resend contact send failed', messageText);
    }
  }

  return jsonResponse({ ok: true }, 200, headers);
});
