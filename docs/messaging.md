# Messaging System

## Overview

The Root Plant Marketplace messaging system lets buyers and sellers chat in real time around listings and orders. It is built on:

- **Supabase Realtime** — WebSocket transport for messages, reactions, read receipts, and typing indicators.
- **Supabase Postgres** — persistence for conversations, messages, attachments, reactions, reads, reports, presence, and an email-notification queue.
- **Upstash Redis** *(planned)* — cross-instance state for rate limits, typing deduplication, email queue locks, and presence fallback.
- **Supabase Edge Functions** *(planned)* — `send-notification-email` and `process-attachments`.

## Data Model

### Core Tables

| Table | Purpose |
|-------|---------|
| `conversations` | One row per conversation thread. Can be linked to a `listing_id`. |
| `conversation_participants` | Many-to-many join with user settings (`is_pinned`, `is_archived`, `is_muted`). |
| `messages` | Message content, sender, reply/forward references, edit/delete timestamps. |
| `message_attachments` | Files uploaded to the `message-attachments` bucket. |
| `message_reactions` | Emoji reactions per message per user. |
| `message_reads` | Last read message per participant per conversation. |
| `message_reports` | User reports of inappropriate messages for admin review. |
| `user_presence` | Online/away/offline status and last-seen timestamps. |
| `email_notification_queue` | Batched offline email notifications with a partial unique index on `(recipient_id, conversation_id)` where not sent/cancelled. |

### Key Indexes

- `messages(conversation_id, created_at)` for fast message history.
- `message_reports(status, created_at)` for the admin review queue.
- Partial unique index on `email_notification_queue(recipient_id, conversation_id)` where `sent_at IS NULL AND cancelled_at IS NULL`.

## Client API

All client code lives in `src/lib/messaging.ts` and is consumed by `src/pages/MessagesPage.tsx`.

```ts
// Conversations
getOrCreateDirectConversation(userId, otherUserId, listingId?): Promise<Conversation>
getUserConversations(userId): ConversationWithDetails[]
hydrateUserConversations(userId): Promise<void>
subscribeToConversations(userId): () => void

// Messages
sendMessage(input: SendMessageInput): Promise<Message>
editMessage(messageId, senderId, content): Promise<Message>
deleteMessage(messageId, senderId): Promise<void>
forwardMessage(messageId, senderId, conversationId): Promise<Message>
getConversationMessages(conversationId): Message[]
searchMessages(userId, query): Promise<Message[]>

// Reactions & Reads
addReaction(messageId, userId, reaction): Promise<void>
removeReaction(messageId, userId, reaction): Promise<void>
markConversationRead(conversationId, userId): Promise<void>

// Attachments
validateAttachment(file, category?) — from `src/lib/validation.ts`
uploadMessageAttachment(file, messageId, conversationId, senderId): Promise<MessageAttachment>

// Reports
reportMessage(messageId, reportedBy, reason, details?): Promise<MessageReport>
getMessageReports(): MessageReport[]
resolveMessageReport(reportId, resolverId, resolution, notes?): Promise<MessageReport>

// Presence & Typing
updatePresence(userId, status): Promise<void>
subscribeToPresenceChannel(userIds): () => void
setTypingWithDebounce(conversationId, userId, displayName, isTyping)
subscribeToConversation(conversationId, onTypingUpdate): () => void
```

## Backwards Compatibility

Legacy `thread_<u1>_<u2>_<listing|general>` IDs are still accepted by `src/lib/api.ts::sendMessage`. The wrapper resolves them to a real `conversations` row via `getOrCreateDirectConversation`. Old URLs like `/messages/thread_*` are transparently upgraded.

## Security

- All user input is sanitized with DOMPurify in `sanitizeText`.
- Attachments are validated against a MIME whitelist and size limits.
- Contact-info detection flags messages that contain phone numbers, emails, LINE IDs, or URLs so buyers stay on-platform until a sale completes.
- Message reports are surfaced in the admin panel (`/admin/messages`) where an admin can dismiss or delete the message.

## Remote Setup Checklist

Apply these to the Supabase project `daacilgagkphafpjdcte` before the feature is live:

1. Run the migrations in `supabase/migrations/` to create the new messaging tables.
2. Enable RLS on every messaging table and apply the policies from the migration files.
3. Create the `message-attachments` storage bucket and set:
   - Public read for `message-attachments/public/*`.
   - Authenticated upload for `message-attachments/private/{user_id}/{conversation_id}/*`.
4. Enable `pg_cron` and schedule the `send-notification-email` edge function to drain the email queue every 2 minutes.
5. Deploy the `send-notification-email` and `process-attachments` edge functions.
6. Configure Upstash Redis credentials in Supabase secrets for rate-limiting and queue locking.

## Admin Review

Visit `/admin/messages` (admin users only) to see pending reports. Actions:

- **Dismiss** — marks the report as resolved without deleting the message.
- **Delete message** — soft-deletes the message and marks the report resolved.

## Email Batching

When a message is sent, the client schedules an email-notification row in `email_notification_queue`. The `send-notification-email` edge function:

1. Selects rows where `scheduled_at <= now()` and not sent/cancelled.
2. Skips recipients whose presence is `online`.
3. Sends one email per recipient per conversation containing the latest preview.
4. Marks rows as sent.

Quiet hours (22:00–08:00 local time) are respected by delaying the `scheduled_at` timestamp until 08:30.

## UX improvements

- **Stable scroll:** the message list only auto-scrolls to the bottom when the user is already near the bottom; typing in the composer does not jump the list.
- **Efficient typing indicators:** typing broadcasts are throttled to ~300 ms and reuse the active conversation realtime channel. The UI keeps a map of active typers keyed by `user_id` so the "..." indicator only appears for other participants.
