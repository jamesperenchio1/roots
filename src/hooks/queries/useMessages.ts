import { useQuery } from '@tanstack/react-query';
import { messageKeys } from '@/lib/queryKeys';
import {
  getConversationMessages,
  getUserConversations,
  getUserPresence,
  hydrateConversationMessages,
  hydrateUserConversations,
  hydrateUserPresence,
  type ConversationWithDetails,
} from '@/lib/messaging';
import type { Message, UserPresence } from '@/types';

const defaultOptions = { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000, retry: 1 } as const;

export function useConversations(userId: string | undefined) {
  return useQuery<ConversationWithDetails[]>({
    queryKey: messageKeys.conversations(userId ?? ''),
    queryFn: async () => {
      if (!userId) return [];
      await hydrateUserConversations(userId);
      return getUserConversations(userId);
    },
    enabled: !!userId,
    ...defaultOptions,
  });
}

export function useUnreadMessageCount(userId: string | undefined): number {
  const { data } = useConversations(userId);
  return data?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
}

export function useConversationMessages(
  userId: string | undefined,
  conversationId: string | undefined
) {
  return useQuery<Message[]>({
    queryKey: messageKeys.conversation(userId ?? '', conversationId ?? ''),
    queryFn: async () => {
      if (!conversationId) return [];
      await hydrateConversationMessages([conversationId]);
      return getConversationMessages(conversationId);
    },
    enabled: !!userId && !!conversationId,
    ...defaultOptions,
  });
}

export const presenceKeys = {
  all: () => ['presence'] as const,
  users: (userIds: string[]) => ['presence', [...userIds].sort().join(',')] as const,
};

export function usePresenceMap(userIds: string[]) {
  const sortedKey = [...userIds].sort().join(',');
  return useQuery<Record<string, UserPresence | undefined>>({
    queryKey: presenceKeys.users(userIds),
    queryFn: async () => {
      const ids = sortedKey ? sortedKey.split(',') : [];
      if (ids.length > 0) await hydrateUserPresence(ids);
      const map: Record<string, UserPresence | undefined> = {};
      ids.forEach((id) => {
        map[id] = getUserPresence(id);
      });
      return map;
    },
    enabled: userIds.length > 0,
    ...defaultOptions,
  });
}
