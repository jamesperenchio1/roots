import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getUserThreads, getThreadMessages, sendMessage, markThreadRead, hydrateUserMessages } from '@/lib/api';
import { getListingById, getUserById } from '@/data/mockData';
import type { Message } from '@/types';
import { toast } from 'sonner';

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
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
  const [threads, setThreads] = useState(getUserThreads(user?.id || ''));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hydrate messages when the user is known, then keep threads in sync.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    hydrateUserMessages(user.id).then(() => {
      if (cancelled) return;
      setThreads(getUserThreads(user.id));
      if (threadId) {
        setMessages(getThreadMessages(threadId));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id, threadId]);

  // Load messages for active thread and mark as read
  useEffect(() => {
    if (threadId && user) {
      const msgs = getThreadMessages(threadId);
      setMessages(msgs);
      markThreadRead(threadId, user.id).then(() => {
        setThreads(getUserThreads(user.id));
      });
    } else {
      setMessages([]);
    }
  }, [threadId, user?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const newMsg: Message = {
            id: raw.id as string,
            thread_id: raw.thread_id as string,
            sender_id: raw.sender_id as string,
            recipient_id: raw.recipient_id as string,
            listing_id: (raw.listing_id as string) || undefined,
            content: raw.content as string,
            flagged_contact_info: !!raw.flagged_contact_info,
            created_at: raw.created_at as string,
            read_at: (raw.read_at as string) || undefined,
            sender: getUserById(raw.sender_id as string),
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (user) {
            setThreads(getUserThreads(user.id));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, user?.id]);

  const activeThread = threads.find((t) => t.threadId === threadId);
  // For a brand-new conversation no thread exists yet, so resolve the other
  // party straight from the thread id rather than showing "Unknown".
  const otherUser = activeThread?.otherUser
    || (threadId && user ? getUserById(getOtherUserIdFromThreadId(threadId, user.id) || '') : undefined);
  const hasContactFlag = messages.some((m) => m.flagged_contact_info);

  const handleSend = async () => {
    if (!input.trim() || !user || !threadId) return;
    setSending(true);
    try {
      let recipientId: string | undefined;
      if (messages.length > 0) {
        const firstMsg = messages[0];
        recipientId = firstMsg.sender_id === user.id ? firstMsg.recipient_id : firstMsg.sender_id;
      } else {
        recipientId = getOtherUserIdFromThreadId(threadId, user.id);
      }
      if (!recipientId) {
        toast.error('Could not determine message recipient');
        setSending(false);
        return;
      }
      const listingId = getListingIdFromThreadId(threadId) || activeThread?.listing?.id;
      const msg = await sendMessage({
        thread_id: threadId,
        sender_id: user.id,
        recipient_id: recipientId,
        listing_id: listingId,
        content: input.trim(),
        flagged_contact_info: false,
      });
      setMessages((prev) => [...prev, msg]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setThreads(getUserThreads(user.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  return (
    <div className="pt-20 pb-0 md:pb-16 px-0 md:px-4 sm:px-6 flex flex-col md:flex-row max-w-7xl mx-auto min-h-[calc(100dvh-80px)] md:min-h-[70vh]">
      {/* Sidebar */}
      <div
        className={`${threadId ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-white/10 bg-zinc-900/20 flex-col md:min-h-[70vh]`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-medium">Messages</h2>
          <Link
            to="/dashboard"
            className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && threads.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3 animate-pulse" />
              <p className="text-zinc-500 text-sm">Loading conversations…</p>
            </div>
          )}
          {!loading && threads.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-2">No conversations yet</p>
              <Link to="/browse" className="text-emerald-400 text-sm hover:underline">
                Browse plants
              </Link>
            </div>
          ) : (
            threads.map((t) => (
              <Link
                to={`/messages/${t.threadId}`}
                key={t.threadId}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  threadId === t.threadId ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {t.listing?.photos?.[0] ? (
                    <img
                      src={t.listing.photos[0].storage_path}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MessageSquare className="w-5 h-5 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {t.otherUser?.display_name || 'Unknown'}
                    </p>
                    <span className="text-xs text-zinc-500 flex-shrink-0">
                      {formatMessageTime(t.lastMessage.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{t.lastMessage.content}</p>
                </div>
                {t.unreadCount > 0 && (
                  <span className="bg-emerald-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                    {t.unreadCount}
                  </span>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Conversation */}
      <div
        className={`${!threadId ? 'hidden md:flex' : 'flex'} flex-1 flex-col md:min-h-[70vh]`}
      >
        {!threadId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <MessageSquare className="w-12 h-12 text-zinc-700 mb-4" />
            <p className="text-zinc-500 mb-2">Select a conversation</p>
            <p className="text-zinc-600 text-sm">
              Choose a thread from the sidebar to start messaging
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-white/10 p-4 flex items-center gap-3">
              <button
                onClick={() => navigate('/messages')}
                className="md:hidden text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {otherUser?.display_name || 'Unknown'}
                </p>
                {activeThread?.listing && (
                  <Link
                    to={`/listing/${activeThread.listing.id}`}
                    className="text-xs text-emerald-400 hover:underline truncate block"
                  >
                    Re: {activeThread.listing.species?.common_name_en || 'Listing'}
                  </Link>
                )}
                {!activeThread?.listing && getListingIdFromThreadId(threadId) && (
                  <Link
                    to={`/listing/${getListingIdFromThreadId(threadId)}`}
                    className="text-xs text-emerald-400 hover:underline truncate block"
                  >
                    Re: {getListingById(getListingIdFromThreadId(threadId)!)?.species?.common_name_en || 'Listing'}
                  </Link>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {hasContactFlag && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2 text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This conversation contains contact information. For your safety, please keep
                    transactions on the platform.
                  </span>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-600 text-sm">No messages yet. Send the first message!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] md:max-w-[60%] rounded-xl px-4 py-2.5 ${
                          isMe ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-200'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <span
                          className={`text-[10px] mt-1 block ${
                            isMe ? 'text-emerald-100/70' : 'text-zinc-500'
                          }`}
                        >
                          {formatMessageTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-4 flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none min-h-[42px]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:hover:bg-emerald-500 text-black rounded-xl px-4 py-2.5 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
