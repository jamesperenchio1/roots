import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flag } from 'lucide-react';
import type { Message } from '@/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  hasContactFlag: boolean;
  typingUsers: Array<{ user_id: string; display_name: string }>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  endRef: React.RefObject<HTMLDivElement | null>;
  dateLocale: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReport: (message: Message) => void;
  onReact: (messageId: string, reaction: string) => void;
  onRemoveReaction: (messageId: string, reaction: string) => void;
  formatTime: (dateStr: string) => string;
}

export default function MessageList({
  messages,
  currentUserId,
  hasContactFlag,
  typingUsers,
  containerRef,
  endRef,
  dateLocale,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onReact,
  onRemoveReaction,
  formatTime,
}: MessageListProps) {
  const { t } = useTranslation(['messages']);

  const dateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isToday) return t('messages:today');
    if (isYesterday) return t('messages:yesterday');
    return d.toLocaleDateString(dateLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={containerRef}>
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
              const isMe = msg.sender_id === currentUserId;
              const prev = group.messages[idx - 1];
              const showAvatar = !isMe && (!prev || prev.sender_id !== msg.sender_id);
              return (
                <div key={msg.id} id={`message-${msg.id}`}>
                  <MessageBubble
                    message={msg}
                    isMe={isMe}
                    showAvatar={showAvatar}
                    currentUserId={currentUserId || ''}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onReport={onReport}
                    onReact={onReact}
                    onRemoveReaction={onRemoveReaction}
                    formatTime={formatTime}
                  />
                </div>
              );
            })}
          </div>
        ))
      )}
      <TypingIndicator names={typingUsers.map((u) => u.display_name)} />
      <div ref={endRef} />
    </div>
  );
}
