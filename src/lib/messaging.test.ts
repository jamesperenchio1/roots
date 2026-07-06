import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUserConversations,
  getConversationMessages,
  getOrCreateThreadId,
  detectContactInfo,
  mapMessage,
} from './messaging';
import {
  MESSAGES,
  CONVERSATIONS,
  CONVERSATION_PARTICIPANTS,
  MESSAGE_ATTACHMENTS,
  MESSAGE_REACTIONS,
  MESSAGE_READS,
  USERS,
} from '@/data/mockData';
import type { Conversation, ConversationParticipant, Message, Profile } from '@/types';

function seedUser(id: string, name: string): Profile {
  const profile: Profile = {
    id,
    display_name: name,
    is_admin: false,
    strike_count: 0,
    is_banned: false,
    language_preference: 'en',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };
  USERS.push(profile);
  return profile;
}

function seedConversation(id: string, userIds: string[], lastMessageId?: string): Conversation {
  const conv: Conversation = {
    id,
    type: userIds.length === 2 ? 'direct' : 'group',
    created_by: userIds[0],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    last_message_id: lastMessageId,
  };
  CONVERSATIONS.push(conv);
  userIds.forEach((uid, i) => {
    CONVERSATION_PARTICIPANTS.push({
      id: `cp-${id}-${uid}`,
      conversation_id: id,
      user_id: uid,
      role: i === 0 ? 'owner' : 'member',
      joined_at: '2023-01-01T00:00:00Z',
      is_muted: false,
      is_pinned: false,
      is_archived: false,
    });
  });
  return conv;
}

function seedMessage(id: string, conversationId: string, senderId: string, content: string, createdAt: string): Message {
  const msg: Message = {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    content_type: 'text',
    flagged_contact_info: false,
    is_system_event: false,
    created_at: createdAt,
  };
  MESSAGES.push(msg);
  return msg;
}

describe('messaging helpers', () => {
  beforeEach(() => {
    MESSAGES.length = 0;
    CONVERSATIONS.length = 0;
    CONVERSATION_PARTICIPANTS.length = 0;
    MESSAGE_ATTACHMENTS.length = 0;
    MESSAGE_REACTIONS.length = 0;
    MESSAGE_READS.length = 0;
    USERS.length = 0;
  });

  describe('getOrCreateThreadId', () => {
    it('creates deterministic thread ids', () => {
      const a = getOrCreateThreadId('u-1', 'u-2');
      const b = getOrCreateThreadId('u-2', 'u-1');
      expect(a).toBe(b);
      expect(a).toBe('thread_u-1_u-2_general');
    });

    it('includes listing id when provided', () => {
      const id = getOrCreateThreadId('u-1', 'u-2', 'listing-123');
      expect(id).toBe('thread_u-1_u-2_listing-123');
    });
  });

  describe('detectContactInfo', () => {
    it('detects Thai phone numbers', () => {
      expect(detectContactInfo('call me at 081-234-5678')).toBe(true);
    });

    it('detects email addresses', () => {
      expect(detectContactInfo('my email is test@example.com')).toBe(true);
    });

    it('detects URLs', () => {
      expect(detectContactInfo('see https://example.com')).toBe(true);
    });

    it('returns false for plain text', () => {
      expect(detectContactInfo('hello, is this plant still available?')).toBe(false);
    });
  });

  describe('getConversationMessages', () => {
    it('returns messages in chronological order', () => {
      seedUser('u-1', 'Alice');
      seedUser('u-2', 'Bob');
      seedConversation('c-1', ['u-1', 'u-2']);
      seedMessage('m-1', 'c-1', 'u-1', 'first', '2023-01-02T00:00:00Z');
      seedMessage('m-2', 'c-1', 'u-2', 'second', '2023-01-01T00:00:00Z');

      const msgs = getConversationMessages('c-1');
      expect(msgs).toHaveLength(2);
      expect(msgs[0].content).toBe('second');
      expect(msgs[1].content).toBe('first');
    });

    it('excludes soft-deleted messages', () => {
      seedUser('u-1', 'Alice');
      seedUser('u-2', 'Bob');
      seedConversation('c-1', ['u-1', 'u-2']);
      const msg = seedMessage('m-1', 'c-1', 'u-1', 'first', '2023-01-01T00:00:00Z');
      msg.deleted_at = '2023-01-02T00:00:00Z';

      const msgs = getConversationMessages('c-1');
      expect(msgs).toHaveLength(0);
    });
  });

  describe('getUserConversations', () => {
    it('sorts conversations by last message time', () => {
      seedUser('u-1', 'Alice');
      seedUser('u-2', 'Bob');
      seedUser('u-3', 'Carol');
      seedConversation('c-1', ['u-1', 'u-2']);
      seedConversation('c-2', ['u-1', 'u-3']);
      seedMessage('m-old', 'c-1', 'u-2', 'old', '2023-01-01T00:00:00Z');
      seedMessage('m-new', 'c-2', 'u-3', 'new', '2023-01-03T00:00:00Z');

      const convs = getUserConversations('u-1');
      expect(convs).toHaveLength(2);
      expect(convs[0].conversation.id).toBe('c-2');
      expect(convs[1].conversation.id).toBe('c-1');
    });

    it('calculates unread count for messages after last read', () => {
      seedUser('u-1', 'Alice');
      seedUser('u-2', 'Bob');
      seedConversation('c-1', ['u-1', 'u-2']);
      const readMsg = seedMessage('m-1', 'c-1', 'u-2', 'read', '2023-01-01T00:00:00Z');
      seedMessage('m-2', 'c-1', 'u-2', 'unread', '2023-01-02T00:00:00Z');
      seedMessage('m-3', 'c-1', 'u-2', 'unread2', '2023-01-03T00:00:00Z');
      const participant = CONVERSATION_PARTICIPANTS.find((p) => p.conversation_id === 'c-1' && p.user_id === 'u-1')!;
      participant.last_read_message_id = readMsg.id;

      const convs = getUserConversations('u-1');
      expect(convs[0].unreadCount).toBe(2);
    });
  });

  describe('mapMessage', () => {
    it('maps a database row to a Message', () => {
      const row = {
        id: 'm-1',
        conversation_id: 'c-1',
        sender_id: 'u-1',
        content: 'hello',
        content_type: 'text',
        flagged_contact_info: false,
        is_system_event: false,
        created_at: '2023-01-01T00:00:00Z',
      };
      const msg = mapMessage(row);
      expect(msg.id).toBe('m-1');
      expect(msg.conversation_id).toBe('c-1');
      expect(msg.content).toBe('hello');
    });
  });
});
