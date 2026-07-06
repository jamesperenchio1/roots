import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  errorResponse,
  getSupabaseEnv,
  jsonResponse,
  requireCronSecret,
} from '../_shared/auth.ts';

interface EmailQueueRow {
  id: string;
  recipient_id: string;
  conversation_id: string;
  message_id: string | null;
  sender_name: string | null;
  preview: string | null;
  scheduled_at: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflightResponse(origin);
  const headers = corsHeaders(origin);

  const env = getSupabaseEnv();
  if (!env) return errorResponse('Server misconfigured', 500, headers);

  if (!requireCronSecret(req)) {
    return errorResponse('Unauthorized', 401, headers);
  }

  const supabase = createServiceClient(env);
  const now = new Date().toISOString();

  const { data: rows, error: fetchError } = await supabase
    .from('email_notification_queue')
    .select('*')
    .lte('scheduled_at', now)
    .is('sent_at', null)
    .is('cancelled_at', null)
    .limit(100);

  if (fetchError) {
    console.error('fetch queue error', fetchError.message);
    return errorResponse('Failed to fetch queue', 500, headers);
  }

  const queue = (rows || []) as EmailQueueRow[];
  const sentIds: string[] = [];
  const skippedIds: string[] = [];

  for (const row of queue) {
    const { data: presence } = await supabase
      .from('user_presence')
      .select('status')
      .eq('id', row.recipient_id)
      .single();

    if (presence?.status === 'online') {
      skippedIds.push(row.id);
      continue;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', row.recipient_id)
      .single();

    if (!profile?.email) {
      skippedIds.push(row.id);
      continue;
    }

    const subject = `New message from ${row.sender_name || 'someone'} on Root Plant Market`;
    const body = `Hi ${profile.display_name || 'there'},\n\nYou have a new message:\n\n${row.preview || ''}\n\nOpen the conversation: https://roots-rho-two.vercel.app/#/messages/${row.conversation_id}`;

    const apiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY');
    const fromAddress = Deno.env.get('EMAIL_FROM') || 'noreply@rootplantmarket.com';

    if (apiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromAddress,
            to: profile.email,
            subject,
            text: body,
          }),
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('resend send failed', message);
        skippedIds.push(row.id);
        continue;
      }
    }

    sentIds.push(row.id);
  }

  if (sentIds.length > 0) {
    const { error: updateError } = await supabase
      .from('email_notification_queue')
      .update({ sent_at: now })
      .in('id', sentIds);

    if (updateError) {
      console.error('mark sent error', updateError.message);
      return errorResponse('Failed to mark emails sent', 500, headers);
    }
  }

  return jsonResponse({ sent: sentIds.length, skipped: skippedIds.length }, 200, headers);
});
