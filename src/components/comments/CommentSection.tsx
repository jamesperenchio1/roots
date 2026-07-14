import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentComposer } from './CommentComposer';
import { CommentTree } from './CommentTree';
import { getCommentsForSpecies, hydrateCommentsForSpecies, getCommentsForListing, hydrateCommentsForListing } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Comment } from '@/types';

interface CommentSectionProps {
  speciesId?: string;
  listingId?: string;
}

export function CommentSection({ speciesId, listingId }: CommentSectionProps) {
  const { t } = useTranslation(['common']);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isListing = !!listingId;
  const targetId = listingId || speciesId || '';

  // version is a manual cache-buster after hydration/mutation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const comments = useMemo(
    () => (isListing ? getCommentsForListing(targetId) : getCommentsForSpecies(targetId)),
    [targetId, isListing, version]
  );

  const hydrate = useCallback(async () => {
    if (isListing) {
      return hydrateCommentsForListing(targetId);
    }
    return hydrateCommentsForSpecies(targetId);
  }, [targetId, isListing]);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    hydrate()
      .then(() => {
        if (mounted) {
          refresh();
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : t('common:errors.generic'));
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [hydrate, t, refresh]);

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
            />
          ))}
        </div>
      )}
    </section>
  );
}
