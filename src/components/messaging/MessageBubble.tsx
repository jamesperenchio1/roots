import { useState, useEffect, memo } from 'react';
import { Reply, Pencil, Trash2, Copy, Forward, Flag, Check, CheckCheck, File, Download, Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { Message } from '@/types';
import ReactionPicker from './ReactionPicker';
import { getAttachmentSignedUrl } from '@/lib/messaging';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  showAvatar: boolean;
  currentUserId: string;
  onReply: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onReact: (messageId: string, reaction: string) => void;
  onRemoveReaction: (messageId: string, reaction: string) => void;
  onReport?: (message: Message) => void;
  formatTime: (dateStr: string) => string;
}

function MessageBubbleInner({
  message,
  isMe,
  showAvatar,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
  onRemoveReaction,
  onReport,
  formatTime,
}: MessageBubbleProps) {
  const { t } = useTranslation(['messages', 'common']);
  const [menuOpen, setMenuOpen] = useState(false);

  const isDeleted = !!message.deleted_at;
  const isEdited = !!message.edited_at && !isDeleted;
  const hasReads = (message.reads?.length || 0) > 0;
  const readByOthers = message.reads?.some((r) => r.user_id !== currentUserId) ?? false;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success(t('messages:copied'));
    } catch {
      toast.error(t('messages:errors.copyFailed'));
    }
  };

  const myReactions = message.reactions?.filter((r) => r.user_id === currentUserId).map((r) => r.reaction) || [];

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
      <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[65%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        {showAvatar && !isMe ? (
          <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-medium text-zinc-400">
            {message.sender?.display_name?.[0]?.toUpperCase() || '?'}
          </div>
        ) : (
          !isMe && <div className="w-8 flex-shrink-0" />
        )}

        <div className="flex flex-col gap-1 min-w-0">
          {message.reply_to && (
            <div className={`text-xs px-3 py-1.5 rounded-lg border ${isMe ? 'border-emerald-500/20 bg-emerald-900/20' : 'border-white/10 bg-zinc-800/50'} text-zinc-400 truncate`}>
              <span className="font-medium text-zinc-300">{message.reply_to.sender?.display_name || t('common:unknownUser')}:</span>{' '}
              {message.reply_to.content}
            </div>
          )}

          <div className="relative">
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`text-left rounded-2xl px-4 py-2.5 transition-colors ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                  } ${isDeleted ? 'italic opacity-70' : ''}`}
                  aria-label={isDeleted ? t('messages:deleted') : message.content}
                >
                  {isDeleted ? (
                    <p className="text-sm">{t('messages:deleted')}</p>
                  ) : (
                    <>
                      {message.attachments && message.attachments.length > 0 && (
                        <MessageAttachments attachments={message.attachments} />
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <div className={`flex items-center justify-end gap-1.5 mt-1 ${isMe ? 'text-emerald-100/70' : 'text-zinc-500'}`}>
                        {isEdited && (
                          <span className="text-[10px]">{t('messages:edited')}</span>
                        )}
                        <span className="text-[10px]">{formatTime(message.created_at)}</span>
                        {isMe && (
                          <span className="flex items-center" aria-label={readByOthers ? t('messages:read') : t('messages:delivered')}>
                            {readByOthers ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : hasReads ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              {!isDeleted && (
                <DropdownMenuContent
                  align={isMe ? 'end' : 'start'}
                  className="bg-zinc-900 border-white/10 text-white"
                >
                  <DropdownMenuItem onClick={() => { onReply(message); setMenuOpen(false); }} className="cursor-pointer">
                    <Reply className="w-4 h-4 mr-2" /> {t('messages:actions.reply')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
                    <Copy className="w-4 h-4 mr-2" /> {t('messages:actions.copy')}
                  </DropdownMenuItem>
                  {isMe && onEdit && (
                    <DropdownMenuItem onClick={() => { onEdit(message); setMenuOpen(false); }} className="cursor-pointer">
                      <Pencil className="w-4 h-4 mr-2" /> {t('messages:actions.edit')}
                    </DropdownMenuItem>
                  )}
                  {onForward && (
                    <DropdownMenuItem onClick={() => { onForward(message); setMenuOpen(false); }} className="cursor-pointer">
                      <Forward className="w-4 h-4 mr-2" /> {t('messages:actions.forward')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <div className="px-2 py-1.5">
                    <ReactionPicker
                      onSelect={(reaction) => {
                        onReact(message.id, reaction);
                        setMenuOpen(false);
                      }}
                      existingReactions={myReactions}
                      align={isMe ? 'end' : 'start'}
                    />
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {isMe && onDelete && (
                    <DropdownMenuItem
                      onClick={() => { onDelete(message); setMenuOpen(false); }}
                      className="cursor-pointer text-red-400 focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> {t('messages:actions.delete')}
                    </DropdownMenuItem>
                  )}
                  {!isMe && onReport && (
                    <DropdownMenuItem onClick={() => { onReport(message); setMenuOpen(false); }} className="cursor-pointer text-amber-400 focus:text-amber-400">
                      <Flag className="w-4 h-4 mr-2" /> {t('messages:actions.report')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              )}
            </DropdownMenu>

            {/* Hover reaction quick-add (desktop) */}
            {!isDeleted && (
              <div className={`absolute bottom-0 ${isMe ? '-left-8' : '-right-8'} hidden group-hover:flex`}>
                <ReactionPicker
                  onSelect={(reaction) => onReact(message.id, reaction)}
                  existingReactions={myReactions}
                />
              </div>
            )}
          </div>

          {/* Reactions row */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {Array.from(new Map(message.reactions.map((r) => [r.reaction, r])).entries()).map(([reaction]) => {
                const count = message.reactions!.filter((r) => r.reaction === reaction).length;
                const isMine = myReactions.includes(reaction);
                return (
                  <button
                    key={reaction}
                    onClick={() => {
                      if (isMine) onRemoveReaction(message.id, reaction);
                      else onReact(message.id, reaction);
                    }}
                    className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                      isMine
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100'
                        : 'bg-zinc-800 border-white/10 text-zinc-300 hover:bg-zinc-700'
                    }`}
                    aria-label={`${reaction} reaction, ${count}`}
                  >
                    <span>{reaction}</span>
                    {count > 1 && <span className="text-[10px] text-zinc-500">{count}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


const MessageBubble = memo(MessageBubbleInner);
export default MessageBubble;

function MessageAttachments({ attachments }: { attachments: import('@/types').MessageAttachment[] }) {
  const { t } = useTranslation(['messages']);
  const [urls, setUrls] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    let cancelled = false;
    attachments.forEach(async (att) => {
      if (att.url) {
        setUrls((prev) => ({ ...prev, [att.id]: att.url }));
        return;
      }
      const url = await getAttachmentSignedUrl(att.storage_bucket, att.storage_path, 3600);
      if (!cancelled && url) {
        setUrls((prev) => ({ ...prev, [att.id]: url }));
      }
    });
    return () => { cancelled = true; };
  }, [attachments]);

  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((att) => {
        const url = urls[att.id];
        const isImage = att.mime_type.startsWith('image/');
        const isVideo = att.mime_type.startsWith('video/');
        const isAudio = att.mime_type.startsWith('audio/');

        if (isImage) {
          return (
            <a
              key={att.id}
              href={url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group block"
            >
              {url ? (
                <img
                  src={url}
                  alt={att.file_name}
                  className="max-h-48 rounded-lg object-cover border border-white/10"
                  loading="lazy"
                />
              ) : (
                <div className="w-24 h-24 bg-zinc-800 rounded-lg flex items-center justify-center border border-white/10 animate-pulse">
                  <Image className="w-6 h-6 text-zinc-600" />
                </div>
              )}
            </a>
          );
        }

        if (isVideo) {
          return (
            <div key={att.id} className="max-w-xs">
              {url ? (
                <video
                  src={url}
                  controls
                  preload="metadata"
                  className="max-h-48 rounded-lg border border-white/10"
                />
              ) : (
                <div className="w-32 h-24 bg-zinc-800 rounded-lg flex items-center justify-center border border-white/10 animate-pulse">
                  <span className="text-xs text-zinc-500">{t('messages:attachments.video')}</span>
                </div>
              )}
            </div>
          );
        }

        if (isAudio) {
          return (
            <div key={att.id} className="w-full">
              {url ? (
                <audio src={url} controls className="w-full max-w-xs" />
              ) : (
                <div className="h-10 bg-zinc-800 rounded-lg flex items-center px-3 border border-white/10 animate-pulse">
                  <span className="text-xs text-zinc-500">{t('messages:attachments.audio')}</span>
                </div>
              )}
            </div>
          );
        }

        return (
          <a
            key={att.id}
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/80 border border-white/10 hover:bg-zinc-700 transition-colors"
          >
            <File className="w-4 h-4 text-zinc-400" />
            <span className="text-xs text-zinc-300 max-w-[140px] truncate">{att.file_name}</span>
            <Download className="w-3 h-3 text-zinc-500" />
          </a>
        );
      })}
    </div>
  );
}
