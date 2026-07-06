import { supabase } from './supabase';
import { logger } from './logger';

const DEFAULT_DELAY_MINUTES = 2;
const QUIET_HOURS_START = 22; // 10 PM
const QUIET_HOURS_END = 8; // 8 AM

function getScheduledAt(_recipientId: string): string {
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
  try {
    await supabase.from('email_notification_queue').upsert(
      {
        recipient_id: recipientId,
        conversation_id: conversationId,
        message_id: messageId,
        sender_name: senderName,
        preview,
        scheduled_at: getScheduledAt(recipientId),
      },
      { onConflict: 'recipient_id,conversation_id' }
    );
  } catch (e) {
    logger.warn('scheduleEmailNotification failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
