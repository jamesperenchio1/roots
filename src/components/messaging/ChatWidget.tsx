'use client'

import { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, ChevronLeft, Maximize2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  useConversations,
  useConversationMessages,
  useUnreadMessageCount,
  usePresenceMap,
} from '@/hooks/queries/useMessages';
import { useDraftMessage } from '@/hooks/useDraftMessage';
import { useMessageActions } from '@/hooks/useMessageActions';
import {
  markConversationRead,
  subscribeToConversation,
  clearTypingTimer,
} from '@/lib/messaging';
import { queryClient } from '@/lib/queryClient';
import { messageKeys } from '@/lib/queryKeys';
import type { Message, MessageAttachment } from '@/types';
import ConversationList from './ConversationList';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import PresenceIndicator from './PresenceIndicator';

export default function ChatWidget() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { t, i18n } = useTranslation(['messages', 'common']);

  // Hidden entirely on the full-page messaging routes, to avoid two overlapping chat UIs.
  const hidden = !!pathname && pathname.startsWith('/messages');

  const [collapsed, setCollapsed] = useState(true);
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);

  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; display_name: string }>>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // useId() (not Date.now()/Math.random()) for the initial value: it's the
  // only value here computed during the SSR render pass, and Date.now()/
  // Math.random() differ between server and client, causing a hydration
  // mismatch (this widget is mounted globally, so every page load would hit
  // it). Values set later via setPendingMessageId (in event handlers,
  // client-only) are unaffected and can keep using Date.now()/Math.random().
  const initialPendingMessageIdSeed = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [pendingMessageId, setPendingMessageId] = useState<string>(
    `m-${initialPendingMessageIdSeed}`
  );
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const lastConversationIdRef = useRef<string | undefined>(undefined);

  const dateLocale = i18n.language === 'th' ? 'th-TH' : 'en-GB';

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
    if (!user?.id) return;
    queryClient.invalidateQueries({ queryKey: messageKeys.conversations(user.id) });
  }, [user?.id]);

  const conversationsQuery = useConversations(user?.id);
  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const loading = conversationsQuery.isPending;
  const unreadCount = useUnreadMessageCount(user?.id);

  const draft = useDraftMessage(activeConversationId);
  const loadDraft = draft.load;

  const { data: fetchedMessages = [] } = useConversationMessages(user?.id, activeConversationId);
  const messages = useMemo(
    () => [...fetchedMessages, ...optimisticMessages],
    [fetchedMessages, optimisticMessages]
  );

  const activeConversation = conversations.find((c) => c.conversation.id === activeConversationId);
  const otherUser = activeConversation?.otherUser;
  const currentParticipant = activeConversation?.participants.find((p) => p.user_id === user?.id);

  const partnerIds = useMemo(
    () => conversations.map((c) => c.otherUser?.id).filter((id): id is string => Boolean(id)),
    [conversations]
  );
  const { data: presenceMap = {} } = usePresenceMap(partnerIds);

  // Reset to the collapsed bubble whenever we land on a full-page messaging
  // route, so this widget's realtime subscription doesn't collide with the
  // full page's own subscription for the same conversation.
  useEffect(() => {
    if (hidden) {
      setCollapsed(true);
      setView('list');
      setActiveConversationId(undefined);
    }
  }, [hidden]);

  // Mark active conversation as read and restore its draft when opened.
  useEffect(() => {
    if (view === 'thread' && activeConversationId && user?.id) {
      setOptimisticMessages([]);
      setPendingMessageId(`m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      setPendingAttachments([]);
      setInput(loadDraft());
      markConversationRead(activeConversationId, user.id).then(() => {
        refreshConversations();
      });
    }
  }, [view, activeConversationId, user?.id, loadDraft, refreshConversations]);

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
  }, [handleMessagesScroll, view, activeConversationId]);

  // Scroll to bottom once when a conversation is opened, and only auto-scroll
  // on new messages when the user is already near the bottom.
  useEffect(() => {
    if (activeConversationId !== lastConversationIdRef.current) {
      initialScrollDoneRef.current = false;
      prevMessageCountRef.current = 0;
      lastConversationIdRef.current = activeConversationId;
    }
    if (!activeConversationId || view !== 'thread') return;
    if (messages.length === 0) return;

    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      setIsAtBottom(true);
      prevMessageCountRef.current = messages.length;
      return;
    }

    if (messages.length > prevMessageCountRef.current && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [activeConversationId, view, messages, isAtBottom]);

  // Realtime subscription for the active conversation (messages + typing).
  useEffect(() => {
    if (!activeConversationId || !user?.id || hidden) return;
    const unsubscribe = subscribeToConversation(activeConversationId, (users) => {
      setTypingUsers(users.filter((u) => u.user_id !== user.id));
    });
    return () => {
      unsubscribe();
      clearTypingTimer(activeConversationId, user.id);
    };
  }, [activeConversationId, user?.id, hidden]);

  const hasContactFlag = messages.some((m) => m.flagged_contact_info);

  const { handleSend, handleInputChange, handleReply, handleReact, handleRemoveReaction } = useMessageActions({
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

  // Edit/delete/report/search/pin/archive/mute are intentionally not built for
  // the widget (v1 scope) — those stay full-page-only via "expand". Passing
  // undefined (rather than no-op handlers) means MessageBubble's own gating
  // hides those menu items entirely instead of rendering dead controls.

  const closeWidget = useCallback(() => {
    setCollapsed(true);
    setView('list');
  }, []);

  const handleBubbleClick = () => {
    if (collapsed) {
      setCollapsed(false);
    } else {
      closeWidget();
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setView('thread');
  };

  const handleBackToList = () => {
    setView('list');
  };

  const handleExpand = () => {
    if (!activeConversationId) return;
    const id = activeConversationId;
    closeWidget();
    setActiveConversationId(undefined);
    router.push(`/messages/${id}`);
  };

  if (!user || hidden) return null;

  return (
    <>
      {collapsed && (
        <button
          onClick={handleBubbleClick}
          aria-label={t('messages:widget.openAria')}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-14 h-14 rounded-full bg-zinc-900 border border-white/10 shadow-xl shadow-black/40 flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-emerald-500 text-[10px] font-bold text-black">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {!collapsed && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-80 sm:w-96 h-[28rem] max-h-[70vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
          {view === 'list' ? (
            <>
              <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-medium text-white">{t('messages:title')}</h2>
                <button
                  onClick={closeWidget}
                  aria-label={t('common:actions.close')}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <ConversationList
                  conversations={conversations}
                  activeId={activeConversationId}
                  loading={loading}
                  emptyTitle={t('messages:loading')}
                  emptyDescription={t('messages:noThreads')}
                  emptyCta={t('common:empty.cta')}
                  dateFormatter={formatMessageTime}
                  presenceMap={presenceMap}
                  onSelect={handleSelectConversation}
                />
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-white/10 p-3 flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleBackToList}
                  aria-label={t('common:actions.back')}
                  className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                    {otherUser?.display_name || t('common:unknownUser')}
                    <PresenceIndicator presence={presenceMap[otherUser?.id || '']} />
                  </p>
                </div>
                <button
                  onClick={handleExpand}
                  aria-label={t('messages:widget.expandAria')}
                  title={t('messages:widget.expandAria')}
                  className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={closeWidget}
                  aria-label={t('common:actions.close')}
                  className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeConversationId && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <MessageList
                    messages={messages}
                    currentUserId={user?.id}
                    hasContactFlag={hasContactFlag}
                    typingUsers={typingUsers}
                    containerRef={messagesContainerRef}
                    endRef={messagesEndRef}
                    dateLocale={dateLocale}
                    onReply={handleReply}
                    onEdit={undefined}
                    onDelete={undefined}
                    onReport={undefined}
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
                    placeholder={t('messages:typeMessage')}
                    conversationId={activeConversationId}
                    messageId={pendingMessageId}
                    onAttachmentsChange={setPendingAttachments}
                    listingSellerId={activeConversation?.listing?.seller_id}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
