// Messaging data layer v2.
// Backed by Supabase (conversations, messages, reactions, reads, attachments, presence)
// and follows the existing in-memory-store + version-pubsub pattern from api.ts.

import { supabase } from './supabase';
import {
  MESSAGES,
  CONVERSATIONS,
  CONVERSATION_PARTICIPANTS,
  MESSAGE_ATTACHMENTS,
  MESSAGE_REACTIONS,
  MESSAGE_READS,
  MESSAGE_REPORTS,
  USER_PRESENCE,
  NOTIFICATIONS,
  getUserById,
  getListingById,
} from '@/data/mockData';
import type {
  Conversation,
  ConversationParticipant,
  Message,
  MessageAttachment,
  MessageReaction,
  MessageRead,
  MessageReport,
  UserPresence,
  EmailQueueItem,
  Profile,
  ParticipantRole,
} from '@/types';
import { sanitizeText, detectContactInfo } from './validation';
import { logger } from './logger';
import { scheduleEmailNotification } from './email-queue';


const MESSAGES_LIMIT = 50;
const CONVERSATIONS_LIMIT = 50;

// Re-export contact-info detector used by legacy callers.
export { detectContactInfo } from './validation';

// ---------- simple helpers ----------
function upsertById<T extends { id: string }>(arr: T[], row: T) {
  const i = arr.findIndex((x) => x.id === row.id);
  if (i >= 0) arr[i] = row;
  else arr.push(row);
}

export function _withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

// ---------- profile resolution ----------
function resolveProfile(id: string | undefined | null): Profile | undefined {
  if (!id) return undefined;
  return getUserById(id);
}

// ---------- mappers ----------
type DbRow = Record<string, unknown>;

function mapConversation(r: DbRow): Conversation {
  return {
    id: r.id as string,
    type: (r.type as Conversation['type']) || 'direct',
    title: (r.title as string | undefined) || undefined,
    listing_id: (r.listing_id as string | undefined) || undefined,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
    updated_at: (r.updated_at as string | undefined) || (r.created_at as string),
    last_message_id: (r.last_message_id as string | undefined) || undefined,
    last_message_at: (r.last_message_at as string | undefined) || undefined,
    archived_at: (r.archived_at as string | undefined) || undefined,
    metadata: (r.metadata as Record<string, unknown> | undefined) || {},
  };
}

function mapParticipant(r: DbRow): ConversationParticipant {
  return {
    id: r.id as string,
    conversation_id: r.conversation_id as string,
    user_id: r.user_id as string,
    role: (r.role as ConversationParticipant['role']) || 'member',
    joined_at: r.joined_at as string,
    left_at: (r.left_at as string | undefined) || undefined,
    last_read_message_id: (r.last_read_message_id as string | undefined) || undefined,
    last_read_at: (r.last_read_at as string | undefined) || undefined,
    is_muted: !!r.is_muted,
    muted_until: (r.muted_until as string | undefined) || undefined,
    is_pinned: !!r.is_pinned,
    is_archived: !!r.is_archived,
  };
}

export function mapMessage(r: DbRow): Message {
  return {
    id: r.id as string,
    conversation_id: r.conversation_id as string,
    sender_id: r.sender_id as string,
    recipient_id: (r.recipient_id as string | undefined) || undefined,
    listing_id: (r.listing_id as string | undefined) || undefined,
    content: (r.content as string) || '',
    content_type: (r.content_type as Message['content_type']) || 'text',
    reply_to_message_id: (r.reply_to_message_id as string | undefined) || undefined,
    forwarded_from_message_id: (r.forwarded_from_message_id as string | undefined) || undefined,
    edited_at: (r.edited_at as string | undefined) || undefined,
    edited_by: (r.edited_by as string | undefined) || undefined,
    deleted_at: (r.deleted_at as string | undefined) || undefined,
    flagged_contact_info: !!r.flagged_contact_info,
    is_system_event: !!r.is_system_event,
    system_event_type: (r.system_event_type as string | undefined) || undefined,
    metadata: (r.metadata as Record<string, unknown> | undefined) || {},
    created_at: r.created_at as string,
    read_at: (r.read_at as string | undefined) || undefined,
    sender: resolveProfile(r.sender_id as string),
  };
}

function mapAttachment(r: DbRow): MessageAttachment {
  return {
    id: r.id as string,
    message_id: r.message_id as string,
    conversation_id: r.conversation_id as string,
    file_name: r.file_name as string,
    file_size: Number(r.file_size || 0),
    mime_type: r.mime_type as string,
    storage_bucket: r.storage_bucket as string,
    storage_path: r.storage_path as string,
    thumbnail_path: (r.thumbnail_path as string | undefined) || undefined,
    preview_path: (r.preview_path as string | undefined) || undefined,
    width: (r.width as number | undefined) ?? undefined,
    height: (r.height as number | undefined) ?? undefined,
    duration_seconds: (r.duration_seconds as number | undefined) ?? undefined,
    metadata: (r.metadata as Record<string, unknown> | undefined) || {},
    created_at: r.created_at as string,
  };
}

function mapReaction(r: DbRow): MessageReaction {
  return {
    id: r.id as string,
    message_id: r.message_id as string,
    user_id: r.user_id as string,
    reaction: r.reaction as string,
    created_at: r.created_at as string,
    user: resolveProfile(r.user_id as string),
  };
}

function mapRead(r: DbRow): MessageRead {
  return {
    id: r.id as string,
    message_id: r.message_id as string,
    conversation_id: r.conversation_id as string,
    user_id: r.user_id as string,
    read_at: r.read_at as string,
    user: resolveProfile(r.user_id as string),
  };
}

function mapReport(r: DbRow): MessageReport {
  return {
    id: r.id as string,
    message_id: r.message_id as string,
    conversation_id: r.conversation_id as string,
    reported_by: r.reported_by as string,
    reason: r.reason as string,
    details: (r.details as string | undefined) || undefined,
    status: (r.status as MessageReport['status']) || 'open',
    created_at: r.created_at as string,
    resolved_at: (r.resolved_at as string | undefined) || undefined,
    resolved_by: (r.resolved_by as string | undefined) || undefined,
    resolution_notes: (r.resolution_notes as string | undefined) || undefined,
    reporter: resolveProfile(r.reported_by as string),
    resolver: resolveProfile(r.resolved_by as string | undefined),
  };
}

function mapPresence(r: DbRow): UserPresence {
  return {
    id: r.id as string,
    status: (r.status as UserPresence['status']) || 'offline',
    last_seen_at: r.last_seen_at as string,
    last_active_at: r.last_active_at as string,
    updated_at: r.updated_at as string,
    user: resolveProfile(r.id as string),
  };
}

export function _mapEmailQueueItem(r: DbRow): EmailQueueItem {
  return {
    id: r.id as string,
    recipient_id: r.recipient_id as string,
    conversation_id: r.conversation_id as string,
    message_id: (r.message_id as string | undefined) || undefined,
    sender_name: (r.sender_name as string | undefined) || undefined,
    preview: (r.preview as string | undefined) || undefined,
    scheduled_at: r.scheduled_at as string,
    sent_at: (r.sent_at as string | undefined) || undefined,
    cancelled_at: (r.cancelled_at as string | undefined) || undefined,
  };
}

// ---------- external stores ----------
let conversationsVersion = 0;
const conversationListeners = new Set<() => void>();
function bumpConversations() {
  conversationsVersion++;
  conversationListeners.forEach((l) => l());
}
export function subscribeConversations(cb: () => void): () => void {
  conversationListeners.add(cb);
  return () => { conversationListeners.delete(cb); };
}
export function getConversationsVersion(): number {
  return conversationsVersion;
}

let messagesVersion = 0;
const messageListeners = new Set<() => void>();
function bumpMessages() {
  messagesVersion++;
  messageListeners.forEach((l) => l());
}
export function subscribeMessages(cb: () => void): () => void {
  messageListeners.add(cb);
  return () => { messageListeners.delete(cb); };
}
export function getMessagesVersion(): number {
  return messagesVersion;
}

let presenceVersion = 0;
const presenceListeners = new Set<() => void>();
function bumpPresence() {
  presenceVersion++;
  presenceListeners.forEach((l) => l());
}
export function subscribePresence(cb: () => void): () => void {
  presenceListeners.add(cb);
  return () => { presenceListeners.delete(cb); };
}
export function getPresenceVersion(): number {
  return presenceVersion;
}

// ---------- hydration ----------
export async function hydrateUserConversations(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .is('left_at', null)
      .order('joined_at', { ascending: false })
      .limit(CONVERSATIONS_LIMIT);
    if (error) throw error;

    const conversationIds = (data || []).map((r) => r.conversation_id as string);
    if (conversationIds.length === 0) {
      bumpConversations();
      return;
    }

    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (convError) throw convError;

    CONVERSATIONS.length = 0;
    CONVERSATIONS.push(...(convRows || []).map(mapConversation));

    const { data: partRows, error: partError } = await supabase
      .from('conversation_participants')
      .select('*')
      .in('conversation_id', conversationIds);
    if (partError) throw partError;

    CONVERSATION_PARTICIPANTS.length = 0;
    CONVERSATION_PARTICIPANTS.push(...(partRows || []).map(mapParticipant));

    // Hydrate messages for these conversations (latest N each, capped total)
    await hydrateConversationMessages(conversationIds, MESSAGES_LIMIT);

    bumpConversations();
  } catch (e) {
    logger.warn('hydrateUserConversations failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function hydrateConversationMessages(
  conversationIds: string[],
  limitPerConversation = MESSAGES_LIMIT
): Promise<void> {
  try {
    if (conversationIds.length === 0) return;
    // Fetch the latest N messages per conversation using a lateral join isn't trivial via supabase-js,
    // so we fetch the most recent messages across all conversations and upsert them.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limitPerConversation * conversationIds.length);
    if (error) throw error;

    (data || []).reverse().forEach((r) => upsertById(MESSAGES, mapMessage(r)));
    await hydrateMessageExtras((data || []).map((r) => r.id as string));
    bumpMessages();
  } catch (e) {
    logger.warn('hydrateConversationMessages failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function loadOlderMessages(conversationId: string, before: string, limit = MESSAGES_LIMIT): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const mapped = (data || []).reverse().map(mapMessage);
    mapped.forEach((m) => upsertById(MESSAGES, m));
    await hydrateMessageExtras(mapped.map((m) => m.id));
    bumpMessages();
    return mapped;
  } catch (e) {
    logger.warn('loadOlderMessages failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

async function hydrateMessageExtras(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;
  const [attachments, reactions, reads] = await Promise.all([
    supabase.from('message_attachments').select('*').in('message_id', messageIds),
    supabase.from('message_reactions').select('*').in('message_id', messageIds),
    supabase.from('message_reads').select('*').in('message_id', messageIds),
  ]);
  (attachments.data || []).forEach((r) => upsertById(MESSAGE_ATTACHMENTS, mapAttachment(r)));
  (reactions.data || []).forEach((r) => upsertById(MESSAGE_REACTIONS, mapReaction(r)));
  (reads.data || []).forEach((r) => upsertById(MESSAGE_READS, mapRead(r)));
}

export async function hydrateUserPresence(userIds: string[]): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .in('id', userIds);
    if (error) throw error;
    (data || []).forEach((r) => upsertById(USER_PRESENCE, mapPresence(r)));
    bumpPresence();
  } catch (e) {
    logger.warn('hydrateUserPresence failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

// ---------- read model helpers ----------
export function getConversationById(id: string): Conversation | undefined {
  return CONVERSATIONS.find((c) => c.id === id);
}

export function getConversationParticipants(conversationId: string): ConversationParticipant[] {
  return CONVERSATION_PARTICIPANTS.filter((p) => p.conversation_id === conversationId && !p.left_at);
}

export function getConversationOtherUserId(conversationId: string, currentUserId: string): string | undefined {
  const participants = getConversationParticipants(conversationId);
  const other = participants.find((p) => p.user_id !== currentUserId);
  return other?.user_id;
}

export function getConversationMessages(conversationId: string): Message[] {
  return MESSAGES.filter((m) => m.conversation_id === conversationId && !m.deleted_at)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(enrichMessage);
}

export function getMessageById(id: string): Message | undefined {
  const m = MESSAGES.find((x) => x.id === id);
  return m ? enrichMessage(m) : undefined;
}

function enrichMessage(m: Message): Message {
  return {
    ...m,
    sender: resolveProfile(m.sender_id),
    reply_to: m.reply_to_message_id ? getMessageById(m.reply_to_message_id) : undefined,
    forwarded_from: m.forwarded_from_message_id ? getMessageById(m.forwarded_from_message_id) : undefined,
    attachments: MESSAGE_ATTACHMENTS.filter((a) => a.message_id === m.id),
    reactions: MESSAGE_REACTIONS.filter((r) => r.message_id === m.id),
    reads: MESSAGE_READS.filter((r) => r.message_id === m.id),
  };
}

export interface ConversationWithDetails {
  conversation: Conversation;
  participants: ConversationParticipant[];
  otherUser?: Profile;
  lastMessage?: Message;
  unreadCount: number;
  listing?: import('@/types').Listing;
}

export function getUserConversations(userId: string): ConversationWithDetails[] {
  const participantRows = CONVERSATION_PARTICIPANTS.filter((p) => p.user_id === userId && !p.left_at);
  return participantRows
    .map((p): ConversationWithDetails | undefined => {
      const conversation = getConversationById(p.conversation_id);
      if (!conversation) return undefined;
      const participants = getConversationParticipants(p.conversation_id);
      const otherUser = resolveProfile(participants.find((x) => x.user_id !== userId)?.user_id);
      const lastMessage = conversation.last_message_id
        ? getMessageById(conversation.last_message_id)
        : getConversationMessages(p.conversation_id).pop();
      const messages = getConversationMessages(p.conversation_id);
      const lastReadMessageId = p.last_read_message_id;
      const unreadCount = lastReadMessageId
        ? messages.filter((m) => m.sender_id !== userId && new Date(m.created_at).getTime() > new Date(getMessageById(lastReadMessageId)?.created_at || 0).getTime()).length
        : messages.filter((m) => m.sender_id !== userId).length;
      return {
        conversation,
        participants,
        otherUser,
        lastMessage,
        unreadCount,
        listing: conversation.listing_id ? getListingById(conversation.listing_id) : undefined,
      };
    })
    .filter((x): x is ConversationWithDetails => !!x)
    .sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.conversation.updated_at).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.conversation.updated_at).getTime();
      return bTime - aTime;
    });
}

export function getUnreadMessageCount(userId: string): number {
  return getUserConversations(userId).reduce((sum, c) => sum + c.unreadCount, 0);
}

// ---------- conversation creation ----------
export interface CreateConversationInput {
  participantIds: string[];
  listingId?: string;
  title?: string;
  createdBy: string;
}

export async function createConversation(input: CreateConversationInput): Promise<Conversation> {
  const { participantIds, listingId, title, createdBy } = input;
  const uniqueParticipants = Array.from(new Set(participantIds));
  if (uniqueParticipants.length < 2) throw new Error('A conversation needs at least two participants.');

  const type: Conversation['type'] = uniqueParticipants.length === 2 ? 'direct' : 'group';

  try {
    const { data: convRow, error: convError } = await supabase
      .from('conversations')
      .insert({
        type,
        title: title || null,
        listing_id: listingId || null,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (convError) throw convError;
    const conversation = mapConversation(convRow);

    const participantInserts = uniqueParticipants.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: (userId === createdBy ? 'owner' : 'member') satisfies ParticipantRole,
    }));

    const { data: partRows, error: partError } = await supabase
      .from('conversation_participants')
      .insert(participantInserts)
      .select('*');
    if (partError) throw partError;

    upsertById(CONVERSATIONS, conversation);
    (partRows || []).forEach((r) => upsertById(CONVERSATION_PARTICIPANTS, mapParticipant(r)));
    bumpConversations();
    return conversation;
  } catch (e) {
    logger.warn('createConversation failed', { error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

export async function getOrCreateDirectConversation(
  userId: string,
  otherUserId: string,
  listingId?: string
): Promise<Conversation> {
  const existing = CONVERSATIONS.find((c) => {
    if (c.type !== 'direct') return false;
    if (listingId && c.listing_id !== listingId) return false;
    const participants = getConversationParticipants(c.id).map((p) => p.user_id);
    return participants.includes(userId) && participants.includes(otherUserId);
  });
  if (existing) return existing;

  return createConversation({
    participantIds: [userId, otherUserId],
    listingId,
    createdBy: userId,
  });
}

// ---------- messaging mutations ----------
export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  contentType?: Message['content_type'];
  replyToMessageId?: string;
  forwardedFromMessageId?: string;
  attachments?: Omit<MessageAttachment, 'id' | 'created_at'>[];
  listingId?: string;
}

export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const {
    conversationId,
    senderId,
    content,
    contentType = 'text',
    replyToMessageId,
    forwardedFromMessageId,
    attachments = [],
    listingId,
  } = input;

  const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created_at = new Date().toISOString();
  const cleanedContent = sanitizeText(content, 5000);
  const flagged = detectContactInfo(cleanedContent);

  const message: Message = {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    content: cleanedContent,
    content_type: contentType,
    reply_to_message_id: replyToMessageId,
    forwarded_from_message_id: forwardedFromMessageId,
    flagged_contact_info: flagged,
    is_system_event: false,
    metadata: {},
    created_at,
    sender: resolveProfile(senderId),
  };

  try {
    await supabase.from('messages').insert({
      id,
      conversation_id: conversationId,
      sender_id: senderId,
      listing_id: listingId || null,
      content: cleanedContent,
      content_type: contentType,
      reply_to_message_id: replyToMessageId || null,
      forwarded_from_message_id: forwardedFromMessageId || null,
      flagged_contact_info: flagged,
      is_system_event: false,
      metadata: {},
      created_at,
    });

    if (attachments.length > 0) {
      const attachmentRows = attachments.map((a) => ({
        message_id: id,
        conversation_id: conversationId,
        file_name: a.file_name,
        file_size: a.file_size,
        mime_type: a.mime_type,
        storage_bucket: a.storage_bucket,
        storage_path: a.storage_path,
        thumbnail_path: a.thumbnail_path || null,
        preview_path: a.preview_path || null,
        width: a.width ?? null,
        height: a.height ?? null,
        duration_seconds: a.duration_seconds ?? null,
        metadata: a.metadata || {},
      }));
      const { data: attRows } = await supabase
        .from('message_attachments')
        .insert(attachmentRows)
        .select('*');
      (attRows || []).forEach((r) => upsertById(MESSAGE_ATTACHMENTS, mapAttachment(r)));

      // Trigger async post-processing (metadata, dimensions, thumbnails).
      supabase.functions
        .invoke('process-attachments', { body: { messageId: id } })
        .catch((err) => logger.warn('process-attachments invoke failed', { error: err.message }));
    }
  } catch (e) {
    logger.warn('sendMessage supabase failed, using local only', { error: e instanceof Error ? e.message : String(e) });
  }

  upsertById(MESSAGES, message);
  bumpMessages();

  // Notify other participants
  const participants = getConversationParticipants(conversationId);
  const senderName = resolveProfile(senderId)?.display_name || 'Someone';
  participants
    .filter((p) => p.user_id !== senderId)
    .forEach((p) => {
      scheduleEmailNotification(
        p.user_id,
        conversationId,
        id,
        senderName,
        cleanedContent.length > 80 ? cleanedContent.slice(0, 80) + '...' : cleanedContent
      );

      const notification = {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: p.user_id,
        type: 'message' as const,
        title: 'New message',
        message: `${senderName}: "${cleanedContent.length > 50 ? cleanedContent.slice(0, 50) + '...' : cleanedContent}"`,
        link: `/messages/${conversationId}`,
        read: false,
        created_at: new Date().toISOString(),
      };
      NOTIFICATIONS.push(notification);
      supabase
        .from('notifications')
        .insert(notification)
        .then(({ error }) => {
          if (error) logger.warn('sendMessage notification insert failed', { error: error.message });
        });
    });

  return enrichMessage(message);
}

export async function editMessage(messageId: string, senderId: string, newContent: string): Promise<Message> {
  const cleaned = sanitizeText(newContent, 5000);
  const edited_at = new Date().toISOString();
  const flagged = detectContactInfo(cleaned);

  const local = MESSAGES.find((m) => m.id === messageId);
  if (local) {
    if (local.sender_id !== senderId) throw new Error('Only the sender can edit this message.');
    local.content = cleaned;
    local.edited_at = edited_at;
    local.edited_by = senderId;
    local.flagged_contact_info = flagged;
  }

  try {
    const { error } = await supabase
      .from('messages')
      .update({
        content: cleaned,
        edited_at,
        edited_by: senderId,
        flagged_contact_info: flagged,
      })
      .eq('id', messageId)
      .eq('sender_id', senderId);
    if (error) throw error;
  } catch (e) {
    logger.warn('editMessage supabase failed', { error: e instanceof Error ? e.message : String(e) });
  }

  bumpMessages();
  return getMessageById(messageId)!;
}

export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const local = MESSAGES.find((m) => m.id === messageId);
  if (local && local.sender_id !== userId) throw new Error('Only the sender can delete this message.');

  const deleted_at = new Date().toISOString();
  if (local) local.deleted_at = deleted_at;

  try {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at })
      .eq('id', messageId)
      .eq('sender_id', userId);
    if (error) throw error;
  } catch (e) {
    logger.warn('deleteMessage supabase failed', { error: e instanceof Error ? e.message : String(e) });
  }

  bumpMessages();
}

// ---------- reactions ----------
export async function addReaction(messageId: string, userId: string, reaction: string): Promise<void> {
  const existing = MESSAGE_REACTIONS.find((r) => r.message_id === messageId && r.user_id === userId && r.reaction === reaction);
  if (existing) return;

  const newReaction: MessageReaction = {
    id: `mr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message_id: messageId,
    user_id: userId,
    reaction,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        reaction,
      })
      .select('*')
      .single();
    if (error) throw error;
    if (data) {
      upsertById(MESSAGE_REACTIONS, mapReaction(data));
      bumpMessages();
      return;
    }
  } catch (e) {
    logger.warn('addReaction supabase failed, using local only', { error: e instanceof Error ? e.message : String(e) });
  }

  upsertById(MESSAGE_REACTIONS, newReaction);
  bumpMessages();
}

export async function removeReaction(messageId: string, userId: string, reaction: string): Promise<void> {
  const idx = MESSAGE_REACTIONS.findIndex((r) => r.message_id === messageId && r.user_id === userId && r.reaction === reaction);
  if (idx >= 0) MESSAGE_REACTIONS.splice(idx, 1);

  try {
    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('reaction', reaction);
  } catch (e) {
    logger.warn('removeReaction supabase failed', { error: e instanceof Error ? e.message : String(e) });
  }

  bumpMessages();
}

// ---------- read receipts ----------
export async function markConversationRead(conversationId: string, userId: string, messageId?: string): Promise<void> {
  const messages = getConversationMessages(conversationId);
  const targetMessage = messageId
    ? messages.find((m) => m.id === messageId)
    : messages[messages.length - 1];
  if (!targetMessage) return;
  if (targetMessage.sender_id === userId) return;

  const now = new Date().toISOString();
  const localParticipant = CONVERSATION_PARTICIPANTS.find(
    (p) => p.conversation_id === conversationId && p.user_id === userId
  );
  if (localParticipant) {
    localParticipant.last_read_message_id = targetMessage.id;
    localParticipant.last_read_at = now;
  }

  upsertById(MESSAGE_READS, {
    id: `mread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message_id: targetMessage.id,
    conversation_id: conversationId,
    user_id: userId,
    read_at: now,
  });

  try {
    await supabase.from('message_reads').upsert(
      {
        message_id: targetMessage.id,
        conversation_id: conversationId,
        user_id: userId,
        read_at: now,
      },
      { onConflict: 'message_id,user_id' }
    );

    await supabase
      .from('conversation_participants')
      .update({ last_read_message_id: targetMessage.id, last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  } catch (e) {
    logger.warn('markConversationRead supabase failed', { error: e instanceof Error ? e.message : String(e) });
  }

  bumpConversations();
  bumpMessages();
}

// ---------- conversation participant settings ----------
export async function updateParticipantSettings(
  conversationId: string,
  userId: string,
  patch: Partial<Pick<ConversationParticipant, 'is_muted' | 'muted_until' | 'is_pinned' | 'is_archived'>>
): Promise<void> {
  const local = CONVERSATION_PARTICIPANTS.find((p) => p.conversation_id === conversationId && p.user_id === userId);
  if (local) Object.assign(local, patch);

  try {
    await supabase
      .from('conversation_participants')
      .update(patch)
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  } catch (e) {
    logger.warn('updateParticipantSettings failed', { error: e instanceof Error ? e.message : String(e) });
  }

  bumpConversations();
}

// ---------- search ----------
export async function searchMessages(userId: string, query: string, limit = 20): Promise<Message[]> {
  try {
    const participantConvIds = CONVERSATION_PARTICIPANTS.filter(
      (p) => p.user_id === userId && !p.left_at
    ).map((p) => p.conversation_id);

    if (participantConvIds.length === 0) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', participantConvIds)
      .is('deleted_at', null)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const mapped = (data || []).map(mapMessage);
    mapped.forEach((m) => upsertById(MESSAGES, m));
    bumpMessages();
    return mapped.map(enrichMessage);
  } catch (e) {
    logger.warn('searchMessages failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

// ---------- reports ----------
export function getMessageReports(): MessageReport[] {
  return [...MESSAGE_REPORTS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function resolveMessageReport(
  reportId: string,
  resolverId: string,
  resolution: 'dismissed' | 'deleted',
  notes?: string
): Promise<MessageReport> {
  const report = MESSAGE_REPORTS.find((r) => r.id === reportId);
  if (!report) throw new Error('Report not found');

  const now = new Date().toISOString();
  report.status = resolution === 'deleted' ? 'resolved_deleted' : 'resolved_dismissed';
  report.resolved_at = now;
  report.resolved_by = resolverId;
  report.resolution_notes = notes;

  if (resolution === 'deleted') {
    const msg = MESSAGES.find((m) => m.id === report.message_id);
    if (msg) {
      msg.deleted_at = now;
      msg.content = '[deleted]';
    }
  }

  try {
    const { error } = await supabase
      .from('message_reports')
      .update({
        status: report.status,
        resolved_at: now,
        resolved_by: resolverId,
        resolution_notes: notes,
      })
      .eq('id', reportId);
    if (error) throw error;

    if (resolution === 'deleted') {
      await supabase.from('messages').update({ deleted_at: now, content: '[deleted]' }).eq('id', report.message_id);
    }
  } catch (e) {
    logger.warn('resolveMessageReport supabase failed, using local only', { error: e instanceof Error ? e.message : String(e) });
  }

  return report;
}

export async function reportMessage(
  messageId: string,
  reportedBy: string,
  reason: string,
  details?: string
): Promise<MessageReport> {
  const message = getMessageById(messageId);
  if (!message) throw new Error('Message not found');

  const report: MessageReport = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message_id: messageId,
    conversation_id: message.conversation_id,
    reported_by: reportedBy,
    reason,
    details,
    status: 'open',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('message_reports')
      .insert({
        message_id: messageId,
        conversation_id: message.conversation_id,
        reported_by: reportedBy,
        reason,
        details: details || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    if (data) {
      const mapped = mapReport(data);
      upsertById(MESSAGE_REPORTS, mapped);
      return mapped;
    }
  } catch (e) {
    logger.warn('reportMessage supabase failed, using local only', { error: e instanceof Error ? e.message : String(e) });
  }

  upsertById(MESSAGE_REPORTS, report);
  return report;
}

// ---------- presence ----------
export async function updatePresence(userId: string, status: UserPresence['status']): Promise<void> {
  const now = new Date().toISOString();
  const local = USER_PRESENCE.find((p) => p.id === userId);
  if (local) {
    local.status = status;
    local.last_active_at = now;
    if (status !== 'online') local.last_seen_at = now;
    local.updated_at = now;
  } else {
    USER_PRESENCE.push({
      id: userId,
      status,
      last_seen_at: now,
      last_active_at: now,
      updated_at: now,
    });
  }

  try {
    await supabase.from('user_presence').upsert(
      {
        id: userId,
        status,
        last_active_at: now,
        last_seen_at: status !== 'online' ? now : undefined,
        updated_at: now,
      },
      { onConflict: 'id' }
    );
  } catch (e) {
    logger.warn('updatePresence failed', { error: e instanceof Error ? e.message : String(e) });
  }

  bumpPresence();
}

export function getUserPresence(userId: string): UserPresence | undefined {
  return USER_PRESENCE.find((p) => p.id === userId);
}

// ---------- typing ----------
const typingTimers: Record<string, NodeJS.Timeout> = {};

export function broadcastTyping(conversationId: string, userId: string, displayName: string, isTyping: boolean): void {
  const channel = supabase.channel(`conversation:${conversationId}`);
  if (isTyping) {
    channel.send({
      type: 'broadcast',
      event: 'TypingStarted',
      payload: { user_id: userId, display_name: displayName, started_at: new Date().toISOString() },
    });
  } else {
    channel.send({
      type: 'broadcast',
      event: 'TypingStopped',
      payload: { user_id: userId },
    });
  }
}

export function setTypingWithDebounce(
  conversationId: string,
  userId: string,
  displayName: string,
  isTyping: boolean,
  stopDelayMs = 3000
): void {
  const key = `${conversationId}:${userId}`;
  if (typingTimers[key]) {
    clearTimeout(typingTimers[key]);
    delete typingTimers[key];
  }
  if (isTyping) {
    broadcastTyping(conversationId, userId, displayName, true);
    typingTimers[key] = setTimeout(() => {
      broadcastTyping(conversationId, userId, displayName, false);
      delete typingTimers[key];
    }, stopDelayMs);
  }
}

export function clearTypingTimer(conversationId: string, userId: string): void {
  const key = `${conversationId}:${userId}`;
  if (typingTimers[key]) {
    clearTimeout(typingTimers[key]);
    delete typingTimers[key];
  }
}

// ---------- realtime ----------
const realtimeChannels: Record<string, ReturnType<typeof supabase.channel>> = {};

function ensureRealtimeChannel(key: string, builder: () => ReturnType<typeof supabase.channel>): () => void {
  if (realtimeChannels[key]) {
    supabase.removeChannel(realtimeChannels[key]);
  }
  const channel = builder();
  realtimeChannels[key] = channel;
  return () => {
    supabase.removeChannel(channel);
    if (realtimeChannels[key] === channel) delete realtimeChannels[key];
  };
}

export function subscribeToConversations(userId: string): () => void {
  return ensureRealtimeChannel(`conversations-${userId}`, () =>
    supabase
      .channel(`conversations-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` },
        () => {
          hydrateUserConversations(userId).then(() => bumpConversations());
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          const conv = mapConversation(payload.new as DbRow);
          const isParticipant = CONVERSATION_PARTICIPANTS.some(
            (p) => p.conversation_id === conv.id && p.user_id === userId && !p.left_at
          );
          if (isParticipant) {
            upsertById(CONVERSATIONS, conv);
            bumpConversations();
          }
        }
      )
      .subscribe()
  );
}

export type TypingListener = (users: Array<{ user_id: string; display_name: string; started_at: string }>) => void;

export function subscribeToConversation(
  conversationId: string,
  onTypingUpdate?: TypingListener
): () => void {
  return ensureRealtimeChannel(`conversation-${conversationId}`, () =>
    supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const msg = mapMessage(payload.new as DbRow);
            upsertById(MESSAGES, msg);
          } else if (payload.eventType === 'UPDATE') {
            const msg = mapMessage(payload.new as DbRow);
            upsertById(MESSAGES, msg);
          }
          bumpMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const r = mapReaction(payload.new as DbRow);
            const convId = MESSAGES.find((m) => m.id === r.message_id)?.conversation_id;
            if (convId === conversationId) upsertById(MESSAGE_REACTIONS, r);
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as DbRow;
            const idx = MESSAGE_REACTIONS.findIndex(
              (r) => r.message_id === old.message_id && r.user_id === old.user_id && r.reaction === old.reaction
            );
            if (idx >= 0) MESSAGE_REACTIONS.splice(idx, 1);
          }
          bumpMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reads' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const r = mapRead(payload.new as DbRow);
            if (r.conversation_id === conversationId) upsertById(MESSAGE_READS, r);
          }
          bumpMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_attachments' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const a = mapAttachment(payload.new as DbRow);
            if (a.conversation_id === conversationId) upsertById(MESSAGE_ATTACHMENTS, a);
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as DbRow;
            const idx = MESSAGE_ATTACHMENTS.findIndex((a) => a.id === old.id);
            if (idx >= 0) MESSAGE_ATTACHMENTS.splice(idx, 1);
          }
          bumpMessages();
        }
      )
      .on(
        'broadcast',
        { event: 'TypingStarted' },
        (payload) => {
          const data = payload.payload as { user_id: string; display_name: string; started_at: string };
          onTypingUpdate?.([data]);
        }
      )
      .on(
        'broadcast',
        { event: 'TypingStopped' },
        () => {
          onTypingUpdate?.([]);
        }
      )
      .subscribe()
  );
}

export function subscribeToPresenceChannel(userIds: string[]): () => void {
  const key = `presence-global`;
  return ensureRealtimeChannel(key, () =>
    supabase
      .channel(key)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          const p = mapPresence(payload.new as DbRow);
          if (userIds.includes(p.id)) {
            upsertById(USER_PRESENCE, p);
            bumpPresence();
          }
        }
      )
      .subscribe()
  );
}

// ---------- legacy compatibility helpers ----------
// These preserve the old api.ts signatures while routing through the new model.

export function getOrCreateThreadId(userId: string, otherUserId: string, listingId?: string): string {
  const sortedIds = [userId, otherUserId].sort();
  return `thread_${sortedIds[0]}_${sortedIds[1]}_${listingId || 'general'}`;
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  // Legacy thread ids have the shape thread_user1_user2_listing|general.
  // Map to a direct conversation if one exists; otherwise no-op.
  const parts = threadId.split('_');
  if (parts.length !== 4 || parts[0] !== 'thread') return;
  const otherUserId = parts[1] === userId ? parts[2] : parts[1];
  if (!otherUserId) return;
  const listingId = parts[3] === 'general' ? undefined : parts[3];
  const conversation = await getOrCreateDirectConversation(userId, otherUserId, listingId);
  await markConversationRead(conversation.id, userId);
}

export async function hydrateUserMessages(userId: string): Promise<void> {
  await hydrateUserConversations(userId);
}

export function getUserThreads(userId: string) {
  return getUserConversations(userId).map((c) => ({
    threadId: c.conversation.id,
    otherUser: c.otherUser,
    lastMessage: c.lastMessage,
    unreadCount: c.unreadCount,
    listing: c.listing,
  }));
}

export function getThreadMessages(threadId: string): Message[] {
  return getConversationMessages(threadId);
}

export async function sendLegacyMessage(
  data: Pick<Message, 'sender_id' | 'recipient_id' | 'listing_id' | 'content' | 'flagged_contact_info'>
): Promise<Message> {
  if (!data.recipient_id) throw new Error('recipient_id is required');
  const conversation = await getOrCreateDirectConversation(
    data.sender_id,
    data.recipient_id,
    data.listing_id
  );
  return sendMessage({
    conversationId: conversation.id,
    senderId: data.sender_id,
    content: data.content,
    listingId: data.listing_id,
  });
}

// ---------- storage helpers for attachments ----------
export const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments';

export function getAttachmentPublicUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function getAttachmentSignedUrl(bucket: string, path: string, expiresInSeconds = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    logger.warn('getAttachmentSignedUrl failed', { error: error.message });
    return null;
  }
  return data.signedUrl;
}

export async function ensureMessageAttachmentBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === MESSAGE_ATTACHMENT_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(MESSAGE_ATTACHMENT_BUCKET, {
        public: false,
        fileSizeLimit: 52428800, // 50 MiB
      });
    }
  } catch (e) {
    logger.warn('ensureMessageAttachmentBucket failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function uploadMessageAttachment(
  file: File,
  conversationId: string,
  messageId: string
): Promise<MessageAttachment> {
  await ensureMessageAttachmentBucket();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) throw new Error('Authentication required to upload attachments');

  const ext = file.type.split('/').pop()?.replace('jpeg', 'jpg') || 'bin';
  const path = `${userId}/${conversationId}/${messageId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;

  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message_id: messageId,
    conversation_id: conversationId,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    storage_bucket: MESSAGE_ATTACHMENT_BUCKET,
    storage_path: path,
    created_at: new Date().toISOString(),
  };
}
