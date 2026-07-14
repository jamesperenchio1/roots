import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleCommentReaction } from '@/lib/api';
import type { Comment } from '@/types';

interface CommentReactionsProps {
  comment: Comment;
  currentUserId?: string;
  onChange?: () => void;
}

const AVAILABLE_REACTIONS = ['like', '❤️', '😂', '😮', '😢', '🎉', '🌿'];

export function CommentReactions({ comment, currentUserId, onChange }: CommentReactionsProps) {
  const { t } = useTranslation(['common']);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const userReaction = comment.reactions?.find((r) => r.user_id === currentUserId)?.reaction;
  const likeCount = comment.likes_count || 0;

  async function handleToggle(reaction: string) {
    if (!currentUserId || loading) return;
    setLoading(true);
    try {
      await toggleCommentReaction(comment.id, currentUserId, reaction);
      onChange?.();
    } catch {
      // ignored
    } finally {
      setLoading(false);
      setShowPicker(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!currentUserId || loading}
        onClick={() => handleToggle('like')}
        className={`h-7 gap-1 rounded-full px-2 text-xs ${
          userReaction === 'like'
            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
        }`}
        aria-label={t('common:comments.reactions.like')}
      >
        <Heart className={`h-3.5 w-3.5 ${userReaction === 'like' ? 'fill-rose-400' : ''}`} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </Button>

      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!currentUserId || loading}
          onClick={() => setShowPicker((s) => !s)}
          className="h-7 w-7 rounded-full p-0 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
          aria-label={t('common:comments.reactions.addReaction')}
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </Button>
        {showPicker && (
          <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-0.5 rounded-lg border border-white/10 bg-zinc-800 p-1 shadow-xl">
            {AVAILABLE_REACTIONS.slice(1).map((reaction) => (
              <button
                key={reaction}
                type="button"
                onClick={() => handleToggle(reaction)}
                className="rounded p-1 text-lg hover:bg-white/10"
                aria-label={t('common:comments.reactions.reactWith', { reaction })}
              >
                {reaction}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
