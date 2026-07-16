'use client'

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentReactions } from './CommentReactions';
import { CommentImageGallery } from './CommentImageGallery';
import { CommentReportDialog } from './CommentReportDialog';
import { deleteComment, editComment } from '@/lib/api';
import type { Comment } from '@/types';

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string;
  depth?: number;
  onReply?: (comment: Comment) => void;
  onChanged?: () => void;
  children?: React.ReactNode;
}

function formatRelativeTime(dateStr: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return t('common:notifications.time.justNow');
  if (minutes < 60) return t('common:notifications.time.minutesAgo', { count: minutes });
  if (hours < 24) return t('common:notifications.time.hoursAgo', { count: hours });
  if (days < 7) return t('common:notifications.time.daysAgo', { count: days });
  return new Date(dateStr).toLocaleDateString();
}

export function CommentCard({ comment, currentUserId, depth = 0, onReply, onChanged, children }: CommentCardProps) {
  const { t } = useTranslation(['common']);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);
  const isAuthor = currentUserId === comment.author_id;
  const isDeleted = !!comment.deleted_at;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSaveEdit() {
    if (!currentUserId || !editText.trim()) return;
    setSubmitting(true);
    try {
      await editComment(comment.id, currentUserId, editText);
      setEditing(false);
      onChanged?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('common:comments.deleteConfirm'))) return;
    await deleteComment(comment.id);
    onChanged?.();
  }

  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-white/5 pl-4 sm:ml-6' : ''}`}>
      <article className="group rounded-lg py-2 hover:bg-white/[0.02]">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author?.avatar_url} alt={comment.author?.display_name || ''} />
            <AvatarFallback className="bg-emerald-900/40 text-emerald-100 text-xs">
              {(comment.author?.display_name || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-white">
                {comment.author?.display_name || t('common:unknown')}
              </span>
              <time className="text-xs text-zinc-500" dateTime={comment.created_at}>
                {formatRelativeTime(comment.created_at, t)}
              </time>
              {comment.edited_at && (
                <span className="text-xs text-zinc-600">({t('common:comments.edited')})</span>
              )}
              {isDeleted && (
                <span className="text-xs text-zinc-600">{t('common:comments.deleted')}</span>
              )}
            </div>

            {editing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  ref={textareaRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[80px] border-white/10 bg-black/30 text-white"
                  maxLength={5000}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={submitting || !editText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {t('common:actions.save')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText(comment.content); }} className="text-zinc-300">
                    {t('common:actions.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                {isDeleted ? (
                  <p className="text-sm italic text-zinc-500">{t('common:comments.deletedMessage')}</p>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm text-zinc-200">{comment.content}</p>
                    <CommentImageGallery images={comment.images || []} />
                  </>
                )}
              </div>
            )}

            {!isDeleted && !editing && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <CommentReactions comment={comment} currentUserId={currentUserId} onChange={onChanged} />
                {currentUserId && (
                  <button
                    type="button"
                    onClick={() => onReply?.(comment)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t('common:comments.reply')}
                  </button>
                )}
                <CommentReportDialog commentId={comment.id} currentUserId={currentUserId} onReported={onChanged} />
                {isAuthor && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="ml-auto inline-flex items-center rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                        aria-label={t('common:actions.more')}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-white/10 bg-zinc-900 text-white">
                      <DropdownMenuItem
                        onClick={() => setEditing(true)}
                        className="hover:bg-white/5 focus:bg-white/5"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {t('common:actions.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-400 hover:bg-white/5 focus:bg-white/5 focus:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('common:actions.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
