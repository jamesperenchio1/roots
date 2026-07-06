import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Search, MoreVertical, Phone, Pin, Archive, VolumeX, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markConversationRead,
  hydrateUserConversations,
  getOrCreateDirectConversation,
  subscribeToConversation,
  searchMessages,
  reportMessage,
  updateParticipantSettings,
  setTypingWithDebounce,
  clearTypingTimer,
  updatePresence,
  subscribePresence,
  subscribeToPresenceChannel,
  getUserPresence,
  hydrateUserPresence,
  type ConversationWithDetails,
} from '@/lib/messaging';
import { getListingById } from '@/data/mockData';
import type { Message, UserPresence } from '@/types';
import ConversationList from '@/components/messaging/ConversationList';
import MessageBubble from '@/components/messaging/MessageBubble';
import MessageComposer from '@/components/messaging/MessageComposer';
import MessageSearch from '@/components/messaging/MessageSearch';
import TypingIndicator from '@/components/messaging/TypingIndicator';
import PresenceIndicator from '@/components/messaging/PresenceIndicator';

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
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['messages', 'common']);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    () => getUserConversations(user?.id || '')
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(threadId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ user_id: string; display_name: string }>>([]);
  const [pendingMessageId, setPendingMessageId] = useState<string>(`m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const [pendingAttachments, setPendingAttachments] = useState<import('@/types').MessageAttachment[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresence | undefined>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const dateLocale = i18n.language === 'th' ? 'th-TH' : 'en-GB';

  const formatMessageTime = useCallback((dateStr: string) => {
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
  }, [t, dateLocale]);

  const refreshConversations = useCallback(() => {
    if (!user) return;
    setConversations(getUserConversations(user.id));
  }, [user]);

  // Hydrate conversations and resolve legacy thread ids into real conversation ids.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    const resolveAndHydrate = async () => {
      if (threadId && isLegacyThreadId(threadId)) {
        const otherUserId = getOtherUserIdFromThreadId(threadId, user.id);
        const listingId = getListingIdFromThreadId(threadId);
        if (otherUserId) {
          const conv = await getOrCreateDirectConversation(user.id, otherUserId, listingId);
          if (!cancelled) {
            setActiveConversationId(conv.id);
            navigate(`/messages/${conv.id}`, { replace: true });
          }
        }
      } else {
        setActiveConversationId(threadId);
      }

      await hydrateUserConversations(user.id);
      if (!cancelled) {
        refreshConversations();
        if (activeConversationId) {
          setMessages(getConversationMessages(activeConversationId));
        }
        setLoading(false);
      }
    };

    resolveAndHydrate();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, threadId]);

  // Load messages for active conversation and mark as read
  useEffect(() => {
    if (activeConversationId && user) {
      const msgs = getConversationMessages(activeConversationId);
      setMessages(msgs);
      setPendingMessageId(`m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      setPendingAttachments([]);
      markConversationRead(activeConversationId, user.id).then(() => {
        refreshConversations();
      });
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, user?.id]);

  // Auto-scroll to bottom on new messages unless user is searching
  useEffect(() => {
    if (!searchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, searchOpen]);

  const activeConversation = conversations.find((c) => c.conversation.id === activeConversationId);
  const otherUser = activeConversation?.otherUser;

  // Update local presence map whenever presence store changes.
  const refreshPresenceMap = useCallback(() => {
    const map: Record<string, UserPresence | undefined> = {};
    conversations.forEach((c) => {
      const id = c.otherUser?.id;
      if (id) map[id] = getUserPresence(id);
    });
    if (otherUser?.id) {
      map[otherUser.id] = getUserPresence(otherUser.id);
    }
    setPresenceMap(map);
  }, [conversations, otherUser?.id]);

  // Realtime subscription for active conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;
    const unsubscribe = subscribeToConversation(activeConversationId, (users) => {
      setTypingUsers(users.filter((u) => u.user_id !== user.id));
    });
    return () => {
      unsubscribe();
      clearTypingTimer(activeConversationId, user.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, user?.id]);

  // Presence: track current user and subscribe to changes for conversation partners.
  useEffect(() => {
    if (!user) return;
    const setOnline = () => updatePresence(user.id, 'online');
    const setOffline = () => updatePresence(user.id, 'offline');
    setOnline();
    const heartbeat = setInterval(setOnline, 30000);
    window.addEventListener('beforeunload', setOffline);

    const unsubscribeStore = subscribePresence(refreshPresenceMap);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', setOffline);
      unsubscribeStore();
      setOffline();
    };
  }, [user?.id, refreshPresenceMap]);

  // Hydrate and subscribe to presence for all conversation partners.
  useEffect(() => {
    if (!user) return;
    const partnerIds = conversations
      .map((c) => c.otherUser?.id)
      .filter((id): id is string => Boolean(id));
    if (partnerIds.length === 0) return;
    hydrateUserPresence(partnerIds);
    refreshPresenceMap();
    const unsubscribe = subscribeToPresenceChannel(partnerIds);
    return () => { unsubscribe(); };
  }, [conversations, user?.id, refreshPresenceMap]);

  const hasContactFlag = messages.some((m) => m.flagged_contact_info);

  const handleSend = async () => {
    if (!input.trim() || !user || !activeConversationId) return;
    setSending(true);
    try {
      if (editingMessage) {
        await editMessage(editingMessage.id, user.id, input.trim());
        setEditingMessage(null);
      } else {
        await sendMessage({
          conversationId: activeConversationId,
          senderId: user.id,
          content: input.trim(),
          listingId: activeConversation?.conversation.listing_id,
          replyToMessageId: replyTo?.id,
          attachments: pendingAttachments,
        });
      }
      setInput('');
      setReplyTo(null);
      refreshConversations();
      setMessages(getConversationMessages(activeConversationId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messages:errors.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (activeConversationId && user) {
      setTypingWithDebounce(
        activeConversationId,
        user.id,
        user.display_name || 'Someone',
        value.trim().length > 0
      );
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    setEditingMessage(null);
  };

  const handleEdit = (message: Message) => {
    if (message.sender_id !== user?.id) return;
    setEditingMessage(message);
    setInput(message.content);
    setReplyTo(null);
  };

  const handleDelete = async (message: Message) => {
    if (!user || message.sender_id !== user.id) return;
    try {
      await deleteMessage(message.id, user.id);
      if (activeConversationId) {
        setMessages(getConversationMessages(activeConversationId));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messages:errors.deleteFailed'));
    }
  };

  const handleReact = async (messageId: string, reaction: string) => {
    if (!user) return;
    await addReaction(messageId, user.id, reaction);
    if (activeConversationId) {
      setMessages(getConversationMessages(activeConversationId));
    }
  };

  const handleRemoveReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    await removeReaction(messageId, user.id, reaction);
    if (activeConversationId) {
      setMessages(getConversationMessages(activeConversationId));
    }
  };

  const handleReport = async (message: Message) => {
    if (!user) return;
    try {
      await reportMessage(message.id, user.id, 'inappropriate', undefined);
      toast.success(t('messages:reportSubmitted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('messages:errors.reportFailed'));
    }
  };

  const handleSearch = async (query: string) => {
    if (!user) return [];
    return searchMessages(user.id, query);
  };

  const handleJump = (messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-emerald-500', 'rounded-2xl');
      setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500', 'rounded-2xl'), 2000);
    }
  };

  const handleTogglePin = async () => {
    if (!user || !activeConversationId) return;
    const isPinned = activeConversation?.participants.find((p) => p.user_id === user.id)?.is_pinned ?? false;
    await updateParticipantSettings(activeConversationId, user.id, { is_pinned: !isPinned });
    refreshConversations();
  };

  const handleToggleArchive = async () => {
    if (!user || !activeConversationId) return;
    const isArchived = activeConversation?.participants.find((p) => p.user_id === user.id)?.is_archived ?? false;
    await updateParticipantSettings(activeConversationId, user.id, { is_archived: !isArchived });
    refreshConversations();
  };

  const handleToggleMute = async () => {
    if (!user || !activeConversationId) return;
    const isMuted = activeConversation?.participants.find((p) => p.user_id === user.id)?.is_muted ?? false;
    await updateParticipantSettings(activeConversationId, user.id, { is_muted: !isMuted });
    refreshConversations();
  };

  const dateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return t('messages:today');
    if (isYesterday) return t('messages:yesterday');
    return d.toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    messages.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString();
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.date === dateKey) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ date: dateKey, messages: [msg] });
      }
    });
    return groups;
  }, [messages]);

  return (
    <div className="pt-20 pb-0 md:pb-16 px-0 md:px-4 sm:px-6 flex flex-col md:flex-row max-w-7xl mx-auto min-h-[calc(100dvh-80px)] md:min-h-[70vh]">
      {/* Sidebar */}
      <div
        className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-white/10 bg-zinc-900/20 flex-col md:min-h-[70vh]`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-medium">{t('messages:title')}</h2>
          <Link
            to="/dashboard"
            className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('common:nav.dashboard')}
          </Link>
        </div>
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          loading={loading}
          emptyTitle={t('messages:loading')}
          emptyDescription={t('messages:noThreads')}
          emptyCta={t('common:empty.cta')}
          dateFormatter={formatMessageTime}
          presenceMap={presenceMap}
          onSelect={(id) => navigate(`/messages/${id}`)}
        />
      </div>

      {/* Conversation */}
      <div
        className={`${!activeConversationId ? 'hidden md:flex' : 'flex'} flex-1 flex-col md:min-h-[70vh]`}
      >
        {!activeConversationId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <MessageSquare className="w-12 h-12 text-zinc-700 mb-4" />
            <p className="text-zinc-500 mb-2">{t('messages:emptyState.title')}</p>
            <p className="text-zinc-600 text-sm">
              {t('messages:emptyState.description')}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-white/10 p-4 flex items-center gap-3">
              <button
                onClick={() => navigate('/messages')}
                className="md:hidden text-zinc-400 hover:text-white transition-colors"
                aria-label={t('common:actions.back')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  {otherUser?.display_name || t('common:unknown')}
                  <PresenceIndicator presence={presenceMap[otherUser?.id || '']} showText />
                </p>
                {activeConversation?.listing && (
                  <Link
                    to={`/listing/${activeConversation.listing.id}`}
                    className="text-xs text-emerald-400 hover:underline truncate block"
                  >
                    {t('messages:reLabel', { name: activeConversation.listing.species?.common_name_en || t('common:unknown') })}
                  </Link>
                )}
                {!activeConversation?.listing && threadId && isLegacyThreadId(threadId) && getListingIdFromThreadId(threadId) && (
                  <Link
                    to={`/listing/${getListingIdFromThreadId(threadId)}`}
                    className="text-xs text-emerald-400 hover:underline truncate block"
                  >
                    {t('messages:reLabel', { name: getListingById(getListingIdFromThreadId(threadId)!)?.species?.common_name_en || t('common:unknown') })}
                  </Link>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-500 hover:text-white"
                onClick={() => setSearchOpen((s) => !s)}
                aria-label={t('messages:search')}
              >
                <Search className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                  <DropdownMenuItem onClick={handleTogglePin} className="cursor-pointer">
                    <Pin className="w-4 h-4 mr-2" />
                    {activeConversation?.participants.find((p) => p.user_id === user?.id)?.is_pinned
                      ? t('messages:actions.unpin')
                      : t('messages:actions.pin')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleArchive} className="cursor-pointer">
                    <Archive className="w-4 h-4 mr-2" />
                    {activeConversation?.participants.find((p) => p.user_id === user?.id)?.is_archived
                      ? t('messages:actions.unarchive')
                      : t('messages:actions.archive')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleMute} className="cursor-pointer">
                    <VolumeX className="w-4 h-4 mr-2" />
                    {activeConversation?.participants.find((p) => p.user_id === user?.id)?.is_muted
                      ? t('messages:actions.unmute')
                      : t('messages:actions.mute')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem disabled className="cursor-pointer opacity-50">
                    <Phone className="w-4 h-4 mr-2" /> {t('messages:actions.call')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {searchOpen && (
              <MessageSearch
                onSearch={handleSearch}
                onJump={handleJump}
                onClose={() => setSearchOpen(false)}
              />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={searchResultsRef}>
              {hasContactFlag && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2 text-amber-400 text-xs">
                  <Flag className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{t('messages:contactFlag')}</span>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-600 text-sm">{t('messages:noMessages')}</p>
                </div>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.date} className="space-y-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded-full">
                        {dateSeparator(group.messages[0].created_at)}
                      </span>
                    </div>
                    {group.messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      const prev = group.messages[idx - 1];
                      const showAvatar = !isMe && (!prev || prev.sender_id !== msg.sender_id);
                      return (
                        <div key={msg.id} id={`message-${msg.id}`}>
                          <MessageBubble
                            message={msg}
                            isMe={isMe}
                            showAvatar={showAvatar}
                            currentUserId={user?.id || ''}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onReport={handleReport}
                            onReact={handleReact}
                            onRemoveReaction={handleRemoveReaction}
                            formatTime={formatMessageTime}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <TypingIndicator names={typingUsers.map((u) => u.display_name)} />
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
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
