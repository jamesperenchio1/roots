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

interface PresenceRow {
  id: string;
  status: string;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
}

Deno.serve(async (req) => {
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
  if (queue.length === 0) {
    return jsonResponse({ sent: 0, skipped: 0 }, 200, headers);
  }

  const recipientIds = [...new Set(queue.map((r) => r.recipient_id))];

  // Batch-fetch presence and profiles in two queries instead of 2N queries.
  const [presenceRes, profilesRes] = await Promise.all([
    supabase
      .from('user_presence')
      .select('id, status')
      .in('id', recipientIds),
    supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', recipientIds),
  ]);

  const presenceMap = new Map<string, string>(
    ((presenceRes.data || []) as PresenceRow[]).map((p) => [p.id, p.status])
  );
  const profileMap = new Map<string, ProfileRow>(
    ((profilesRes.data || []) as ProfileRow[]).map((p) => [p.id, p])
  );

  const apiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY');
  const fromAddress = Deno.env.get('EMAIL_FROM') || 'noreply@rootplantmarket.com';
  const appUrl = Deno.env.get('APP_URL') || 'https://roots-rho-two.vercel.app';

  const sentIds: string[] = [];
  const skippedIds: string[] = [];

  // Send emails concurrently (capped at queue limit of 100).
  await Promise.all(
    queue.map(async (row) => {
      const presence = presenceMap.get(row.recipient_id);
      if (presence === 'online') {
        skippedIds.push(row.id);
        return;
      }

      const profile = profileMap.get(row.recipient_id);
      if (!profile?.email) {
        skippedIds.push(row.id);
        return;
      }

      const subject = `New message from ${row.sender_name || 'someone'} on Root Plant Market`;
      const body = `Hi ${profile.display_name || 'there'},\n\nYou have a new message:\n\n${
        row.preview || ''
      }\n\nOpen the conversation: ${appUrl}/#/messages/${row.conversation_id}`;

      if (apiKey) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: fromAddress, to: profile.email, subject, text: body }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error('resend send failed', res.status, text);
            skippedIds.push(row.id);
            return;
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error('resend send failed', message);
          skippedIds.push(row.id);
          return;
        }
      }

      sentIds.push(row.id);
    })
  );

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
