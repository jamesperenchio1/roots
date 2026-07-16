'use client'

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import {
  markConversationRead,
  getOrCreateDirectConversation,
  subscribeToConversation,
  clearTypingTimer,
  updatePresence,
  subscribeToPresenceChannel,
} from '@/lib/messaging';
import { queryClient } from '@/lib/queryClient';
import { messageKeys } from '@/lib/queryKeys';
import { useConversations, useConversationMessages, usePresenceMap } from '@/hooks/queries/useMessages';
import { useDraftMessage } from '@/hooks/useDraftMessage';
import { useMessageActions } from '@/hooks/useMessageActions';
import { useListing } from '@/hooks/queries/useListings';
import { useAuth } from '@/hooks/useAuth';
import type { Message, MessageAttachment } from '@/types';
import MessageComposer from '@/components/messaging/MessageComposer';
import MessageSearch from '@/components/messaging/MessageSearch';
import MessagesSidebar from '@/components/messaging/MessagesSidebar';
import ConversationHeader from '@/components/messaging/ConversationHeader';
import MessageList from '@/components/messaging/MessageList';
import EmptyConversation from '@/components/messaging/EmptyConversation';

function isLegacyThreadId(id: string): boolean {
  return id.startsWith('thread_');
}

function getOtherUserIdFromThreadId(threadId: string, currentUserId: string): string | undefined {
  const parts = threadId.split('_');
  if (parts.length >= 4 && parts[0] === 'thread') {
    const p1 = parts[1];
    const p2 = parts[2];
    if (p1 === currentUserId) return p2;
    if (p2 === currentUserId) return p1;
  }
  return undefined;
}

function getListingIdFromThreadId(threadId: string): string | undefined {
  const parts = threadId.split('_');
  if (parts.length >= 4 && parts[0] === 'thread' && parts[3] !== 'general') {
    return parts[3];
  }
  return undefined;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const { threadId } = useParams<{ threadId?: string }>() ?? { threadId: '' };
  const legacyListingId =
    threadId && isLegacyThreadId(threadId) ? getListingIdFromThreadId(threadId) : undefined;
  const { data: legacyListing } = useListing(legacyListingId);
  const router = useRouter();
  const { t, i18n } = useTranslation(['messages', 'common']);
  const conversationsQuery = useConversations(user?.id);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const loading = conversationsQuery.isPending;
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(threadId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; display_name: string }>>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [pendingMessageId, setPendingMessageId] = useState<string>(
    `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const lastConversationIdRef = useRef<string | undefined>(undefined);

  const dateLocale = i18n.language === 'th' ? 'th-TH' : 'en-GB';

  // Draft persistence per conversation.
  const draft = useDraftMessage(activeConversationId);
  const loadDraft = draft.load;

  const formatMessageTime = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return t('messages:relative.justNow');
      if (diffMins < 60) return t('messages:relative.minutesAgo', { count: diffMins });
      if (diffHours < 24) return t('messages:relative.hoursAgo', { count: diffHours });
      if (diffDays < 7) return t('messages:relative.daysAgo', { count: diffDays });
      return d.toLocaleDateString(dateLocale);
    },
    [t, dateLocale]
  );

  const refreshConversations = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: messageKeys.conversations(userId) });
  }, [userId]);

  const { data: fetchedMessages = [] } = useConversationMessages(userId, activeConversationId);
  const messages = useMemo(
    () => [...fetchedMessages, ...optimisticMessages],
    [fetchedMessages, optimisticMessages]
  );

  // Resolve legacy thread ids into real conversation ids.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const resolve = async () => {
      if (threadId && isLegacyThreadId(threadId)) {
        const otherUserId = getOtherUserIdFromThreadId(threadId, userId);
        const listingId = getListingIdFromThreadId(threadId);
        if (otherUserId) {
          const conv = await getOrCreateDirectConversation(userId, otherUserId, listingId);
          if (!cancelled) {
            setActiveConversationId(conv.id);
            router.replace(`/messages/${conv.id}`);
            refreshConversations();
          }
        }
      } else {
        setActiveConversationId(threadId);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [userId, threadId, router, refreshConversations]);

  // Mark active conversation as read; restore draft; reset per-conversation state.
  useEffect(() => {
    if (activeConversationId && userId) {
      setOptimisticMessages([]);
      setPendingMessageId(`m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      setPendingAttachments([]);
      setInput(loadDraft());
      markConversationRead(activeConversationId, userId).then(() => {
        refreshConversations();
      });
    }
  }, [activeConversationId, userId, loadDraft, refreshConversations]);

  const checkIsAtBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const handleMessagesScroll = useCallback(() => {
    setIsAtBottom(checkIsAtBottom());
  }, [checkIsAtBottom]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleMessagesScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleMessagesScroll);
  }, [handleMessagesScroll]);

  // Scroll to bottom once when a conversation is opened, and only auto-scroll
  // on new messages when the user is already near the bottom.
  useEffect(() => {
    if (activeConversationId !== lastConversationIdRef.current) {
      initialScrollDoneRef.current = false;
      prevMessageCountRef.current = 0;
      lastConversationIdRef.current = activeConversationId;
    }
    if (!activeConversationId) return;
    if (messages.length === 0) return;

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setIsAtBottom(true);
      prevMessageCountRef.current = messages.length;
      return;
    }

    if (messages.length > prevMessageCountRef.current && !searchOpen && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [activeConversationId, messages, isAtBottom, searchOpen]);

  const activeConversation = conversations.find((c) => c.conversation.id === activeConversationId);
  const otherUser = activeConversation?.otherUser;
  const currentParticipant = activeConversation?.participants.find((p) => p.user_id === user?.id);

  const partnerIds = useMemo(
    () => conversations.map((c) => c.otherUser?.id).filter((id): id is string => Boolean(id)),
    [conversations]
  );
  const { data: presenceMap = {} } = usePresenceMap(partnerIds);

  // Realtime subscription for active conversation
  useEffect(() => {
    if (!activeConversationId || !userId) return;
    const unsubscribe = subscribeToConversation(activeConversationId, (users) => {
      setTypingUsers(users.filter((u) => u.user_id !== userId));
    });
    return () => {
      unsubscribe();
      clearTypingTimer(activeConversationId, userId);
    };
  }, [activeConversationId, userId]);

  // Presence: track current user and subscribe to changes for conversation partners.
  useEffect(() => {
    if (!user) return;
    const setOnline = () => updatePresence(user.id, 'online');
    const setOffline = () => updatePresence(user.id, 'offline');
    setOnline();
    const heartbeat = setInterval(setOnline, 30000);
    window.addEventListener('beforeunload', setOffline);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', setOffline);
      setOffline();
    };
  }, [user]);

  // Subscribe to presence changes for all conversation partners.
  useEffect(() => {
    if (!user || partnerIds.length === 0) return;
    const unsubscribe = subscribeToPresenceChannel(partnerIds);
    return () => {
      unsubscribe();
    };
  }, [partnerIds, user]);

  const hasContactFlag = messages.some((m) => m.flagged_contact_info);

  const {
    handleSend,
    handleInputChange,
    handleReply,
    handleEdit,
    handleDelete,
    handleReact,
    handleRemoveReaction,
    handleReport,
    handleSearch,
    handleJump,
    handleTogglePin,
    handleToggleArchive,
    handleToggleMute,
  } = useMessageActions({
    user,
    activeConversationId,
    activeConversationListingId: activeConversation?.conversation.listing_id,
    currentParticipant,
    draft,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    pendingAttachments,
    pendingMessageId,
    setPendingMessageId,
    input,
    setInput,
    setSending,
    setOptimisticMessages,
    refreshConversations,
    t,
  });

  const legacyListingName = legacyListing?.species?.common_name_en;

  return (
    <div className="pt-20 pb-0 md:pb-16 px-0 md:px-4 sm:px-6 flex flex-col md:flex-row max-w-7xl mx-auto min-h-[calc(100dvh-80px)] md:min-h-[70vh]">
      <MessagesSidebar
        hasActiveConversation={!!activeConversationId}
        conversations={conversations}
        activeId={activeConversationId}
        loading={loading}
        dateFormatter={formatMessageTime}
        presenceMap={presenceMap}
        onSelect={(id) => router.push(`/messages/${id}`)}
      />

      <div
        className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col md:min-h-[70vh]`}
      >
        {!activeConversationId ? (
          <EmptyConversation />
        ) : (
          <>
            <ConversationHeader
              otherUser={otherUser}
              listing={activeConversation?.listing}
              legacyListingId={legacyListingId}
              legacyListingName={legacyListingName}
              presence={presenceMap[otherUser?.id || '']}
              currentParticipant={currentParticipant}
              onBack={() => router.push('/messages')}
              onToggleSearch={() => setSearchOpen((s) => !s)}
              onTogglePin={handleTogglePin}
              onToggleArchive={handleToggleArchive}
              onToggleMute={handleToggleMute}
            />

            {searchOpen && (
              <MessageSearch
                onSearch={handleSearch}
                onJump={handleJump}
                onClose={() => setSearchOpen(false)}
              />
            )}

            <MessageList
              messages={messages}
              currentUserId={user?.id}
              hasContactFlag={hasContactFlag}
              typingUsers={typingUsers}
              containerRef={messagesContainerRef}
              endRef={messagesEndRef}
              dateLocale={dateLocale}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReport={handleReport}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
              formatTime={formatMessageTime}
            />

            <MessageComposer
              value={input}
              onChange={handleInputChange}
              onSend={handleSend}
              sending={sending}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
              placeholder={editingMessage ? t('messages:editPlaceholder') : t('messages:typeMessage')}
              conversationId={activeConversationId}
              messageId={pendingMessageId}
              onAttachmentsChange={setPendingAttachments}
            />
          </>
        )}
      </div>
    </div>
  );
}
