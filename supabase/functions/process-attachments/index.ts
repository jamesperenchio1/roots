import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { attachment_id: attachmentId } = await req.json().catch(() => ({}));
  if (!attachmentId) {
    return new Response(JSON.stringify({ error: 'attachment_id required' }), { status: 400 });
  }

  const { data: attachment, error } = await supabase
    .from('message_attachments')
    .select('*')
    .eq('id', attachmentId)
    .single();

  if (error || !attachment) {
    return new Response(JSON.stringify({ error: error?.message || 'Not found' }), { status: 404 });
  }

  // Placeholder for image/video post-processing: virus scan, thumbnail generation,
  // metadata extraction. For now we simply mark the attachment as processed.
  const updates: Record<string, unknown> = { metadata: { ...attachment.metadata, processed: true } };

  // If it's an image we could generate a thumbnail using a Deno image library.
  if (attachment.mime_type.startsWith('image/')) {
    updates.metadata = { ...updates.metadata, thumbnail_ready: true };
  }

  const { error: updateError } = await supabase
    .from('message_attachments')
    .update(updates)
    .eq('id', attachmentId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, attachmentId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
