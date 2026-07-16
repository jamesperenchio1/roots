'use client'

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentComposer } from './CommentComposer';
import { CommentTree } from './CommentTree';
import { subscribeToComments } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { commentKeys } from '@/lib/queryKeys';
import { useComments } from '@/hooks/queries/useComments';
import { useAuth } from '@/hooks/useAuth';
import type { Comment } from '@/types';

interface CommentSectionProps {
  speciesId?: string;
  listingId?: string;
}

export function CommentSection({ speciesId, listingId }: CommentSectionProps) {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  const isListing = !!listingId;
  const targetId = listingId || speciesId || '';

  const commentsQuery = useComments(targetId || undefined, isListing);
  const comments = commentsQuery.data ?? [];
  const loading = commentsQuery.isPending;
  const error = commentsQuery.isError
    ? (commentsQuery.error instanceof Error ? commentsQuery.error.message : t('common:errors.generic'))
    : null;

  // Subscribe to realtime comment changes so new comments appear without a manual refresh.
  useEffect(() => {
    if (!targetId) return;
    return subscribeToComments(targetId, isListing);
  }, [targetId, isListing]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: isListing ? commentKeys.forListing(targetId) : commentKeys.forSpecies(targetId),
    });
  }, [isListing, targetId]);

  function handleSubmitted() {
    setReplyTo(null);
    refresh();
  }

  if (loading) {
    return (
      <section className="space-y-4" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label={t('common:comments.sectionLabel')}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-400" />
          {t('common:comments.title')}
        </h2>
      </div>

      <CommentComposer
        speciesId={speciesId}
        listingId={listingId}
        author={user}
        parentComment={replyTo}
        onSubmitted={handleSubmitted}
        onCancelReply={() => setReplyTo(null)}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      {comments.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-8 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
          <h3 className="mt-3 text-lg font-medium text-white">{t('common:comments.emptyTitle')}</h3>
          <p className="mt-1 text-sm text-zinc-400">{t('common:comments.emptyDescription')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map((comment) => (
            <CommentTree
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onReply={setReplyTo}
              onChanged={refresh}
              version={commentsQuery.dataUpdatedAt}
            />
          ))}
        </div>
      )}
    </section>
  );
}
