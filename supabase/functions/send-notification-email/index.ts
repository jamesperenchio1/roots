import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

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
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date().toISOString();

  // Pull due rows and lock them in one go using the partial unique index.
  const { data: rows, error: fetchError } = await supabase
    .from('email_notification_queue')
    .select('*')
    .lte('scheduled_at', now)
    .is('sent_at', null)
    .is('cancelled_at', null)
    .limit(100);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const queue = (rows || []) as EmailQueueRow[];
  const sentIds: string[] = [];
  const skippedIds: string[] = [];

  for (const row of queue) {
    // Skip if the recipient is currently online.
    const { data: presence } = await supabase
      .from('user_presence')
      .select('status')
      .eq('id', row.recipient_id)
      .single();

    if (presence?.status === 'online') {
      skippedIds.push(row.id);
      continue;
    }

    // Fetch recipient email.
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', row.recipient_id)
      .single();

    if (!profile?.email) {
      skippedIds.push(row.id);
      continue;
    }

    // Send email via configured provider. Replace with Resend/Postmark/SendGrid as needed.
    const subject = `New message from ${row.sender_name || 'someone'} on Root Plant Market`;
    const body = `Hi ${profile.display_name || 'there'},\n\nYou have a new message:\n\n${row.preview || ''}\n\nOpen the conversation: https://rootplantmarket.com/messages/${row.conversation_id}`;

    const apiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY');
    const fromAddress = Deno.env.get('EMAIL_FROM') || 'noreply@rootplantmarket.com';

    if (apiKey) {
      // Example Resend call
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
    }

    sentIds.push(row.id);
  }

  if (sentIds.length > 0) {
    await supabase.from('email_notification_queue').update({ sent_at: now }).in('id', sentIds);
  }

  return new Response(
    JSON.stringify({ sent: sentIds.length, skipped: skippedIds.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
