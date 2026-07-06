import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { corsHeaders, preflightResponse } from '../_shared/cors.ts';
import {
  createServiceClient,
  errorResponse,
  getAuthUser,
  getSupabaseEnv,
  jsonResponse,
} from '../_shared/auth.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflightResponse(origin);
  const headers = corsHeaders(origin);

  const env = getSupabaseEnv();
  if (!env) return errorResponse('Server misconfigured', 500, headers);

  const user = await getAuthUser(req, env);
  if (!user) return errorResponse('Unauthorized', 401, headers);

  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, headers);

  let body: { attachment_id?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON', 400, headers);
  }

  const attachmentId = body.attachment_id;
  if (!attachmentId || typeof attachmentId !== 'string') {
    return errorResponse('attachment_id required', 400, headers);
  }

  const supabase = createServiceClient(env);

  const { data: attachment, error } = await supabase
    .from('message_attachments')
    .select('*, message:messages!inner(conversation_id, sender_id)')
    .eq('id', attachmentId)
    .single();

  if (error || !attachment) {
    return errorResponse('Not found', 404, headers);
  }

  // Verify caller is a participant of the conversation or an admin.
  const conversationId = (attachment.message as { conversation_id: string }).conversation_id;
  const senderId = (attachment.message as { sender_id: string }).sender_id;

  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!participant && !profile?.is_admin && senderId !== user.id) {
    return errorResponse('Forbidden', 403, headers);
  }

  // Placeholder for image/video post-processing: virus scan, thumbnail generation,
  // metadata extraction. For now we simply mark the attachment as processed.
  const updates: Record<string, unknown> = { metadata: { ...attachment.metadata, processed: true } };

  if (attachment.mime_type?.startsWith('image/')) {
    updates.metadata = { ...updates.metadata, thumbnail_ready: true };
  }

  const { error: updateError } = await supabase
    .from('message_attachments')
    .update(updates)
    .eq('id', attachmentId);

  if (updateError) {
    console.error('process attachment error', updateError.message);
    return errorResponse('Failed to update attachment', 500, headers);
  }

  return jsonResponse({ ok: true, attachmentId }, 200, headers);
});
