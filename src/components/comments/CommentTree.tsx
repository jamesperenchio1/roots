import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommentCard } from './CommentCard';
import { getCommentReplies } from '@/lib/api';
import type { Comment } from '@/types';

interface CommentTreeProps {
  comment: Comment;
  currentUserId?: string;
  depth?: number;
  maxDepth?: number;
  onReply?: (comment: Comment) => void;
  onChanged?: () => void;
  // Bumped when the comments query refetches so replies recompute from the store.
  version?: number;
}

export function CommentTree({
  comment,
  currentUserId,
  depth = 0,
  maxDepth = 4,
  onReply,
  onChanged,
  version,
}: CommentTreeProps) {
  const { t } = useTranslation(['common']);
  const [expanded, setExpanded] = useState(depth < 2);
  // replies_count is a manual cache-buster when new replies are added
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const replies = useMemo(() => getCommentReplies(comment.id), [comment.id, comment.replies_count, onChanged, version]);

  if (comment.status === 'hidden' && comment.author_id !== currentUserId) return null;

  return (
    <CommentCard
      comment={comment}
      currentUserId={currentUserId}
      depth={depth}
      onReply={onReply}
      onChanged={onChanged}
    >
      {comment.replies_count > 0 && (
        <div className="mt-1">
          {expanded ? (
            <div className="space-y-1">
              {replies.map((reply) => (
                <CommentTree
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  onReply={depth + 1 < maxDepth ? onReply : undefined}
                  onChanged={onChanged}
                  version={version}
                />
              ))}
              {depth + 1 >= maxDepth && comment.replies_count > replies.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-emerald-400 hover:bg-emerald-500/10"
                >
                  {t('common:comments.viewThread')}
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(true)}
              className="h-7 gap-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              {t('common:comments.showReplies', { count: comment.replies_count })}
            </Button>
          )}
          {expanded && replies.length > 0 && depth > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
              className="h-7 gap-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              {t('common:comments.hideReplies')}
            </Button>
          )}
        </div>
      )}
    </CommentCard>
  );
}
