import { supabase } from './supabase';
import { logger } from './logger';

const DEFAULT_DELAY_MINUTES = 2;
const QUIET_HOURS_START = 22; // 10 PM
const QUIET_HOURS_END = 8; // 8 AM

function getScheduledAt(): string {
  const now = new Date();
  const scheduled = new Date(now.getTime() + DEFAULT_DELAY_MINUTES * 60 * 1000);

  // Respect quiet hours per recipient timezone. Without per-user timezone, use a simple local check.
  const hour = scheduled.getHours();
  if (hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END) {
    // Push to 8:30 AM next day
    scheduled.setHours(QUIET_HOURS_END, 30, 0, 0);
    if (hour >= QUIET_HOURS_START) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
  }

  return scheduled.toISOString();
}

export async function scheduleEmailNotification(
  recipientId: string,
  conversationId: string,
  messageId: string,
  senderName: string,
  preview: string
): Promise<void> {
  // The unique index on (recipient_id, conversation_id) is a partial index
  // (WHERE sent_at IS NULL AND cancelled_at IS NULL). PostgREST upsert cannot
  // target partial indexes via onConflict, so we do a manual cancel+insert to
  // coalesce notifications: cancel the old pending row then insert a fresh one
  // with the latest message preview. Both operations are best-effort.
  try {
    await supabase
      .from('email_notification_queue')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('recipient_id', recipientId)
      .eq('conversation_id', conversationId)
      .is('sent_at', null)
      .is('cancelled_at', null);

    await supabase.from('email_notification_queue').insert({
      recipient_id: recipientId,
      conversation_id: conversationId,
      message_id: messageId,
      sender_name: senderName,
      preview,
      scheduled_at: getScheduledAt(),
    });
  } catch (e) {
    logger.warn('scheduleEmailNotification failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
