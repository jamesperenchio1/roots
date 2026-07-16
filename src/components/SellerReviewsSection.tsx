'use client'

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, MessageSquare } from 'lucide-react';
import { SellerReviewCard, SellerReviewCardSkeleton } from './SellerReviewCard';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getSellerReviews, getSellerReviewStats } from '@/lib/api';

interface SellerReviewsSectionProps {
  sellerId: string;
  limit?: number;
}

export function SellerReviewsSection({ sellerId, limit }: SellerReviewsSectionProps) {
  const { t } = useTranslation(['common']);
  const stats = useMemo(() => getSellerReviewStats(sellerId), [sellerId]);
  const reviews = useMemo(() => {
    const all = getSellerReviews(sellerId);
    return limit ? all.slice(0, limit) : all;
  }, [sellerId, limit]);

  const maxDistribution = Math.max(...Object.values(stats.distribution), 1);

  if (stats.count === 0) {
    return (
      <section className="rounded-xl border border-white/5 bg-zinc-900/30 p-6 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-zinc-600" />
        <h3 className="mt-3 text-lg font-medium text-white">{t('common:sellerReviews.noReviewsYet')}</h3>
        <p className="mt-1 text-sm text-zinc-400">{t('common:sellerReviews.firstReviewPrompt')}</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="text-center sm:text-left">
            <div className="text-5xl font-bold text-white">{stats.average.toFixed(1)}</div>
            <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(stats.average) ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {t('common:sellerReviews.basedOnCount', { count: stats.count })}
            </p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] || 0;
              const percentage = Math.round((count / stats.count) * 100);
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-zinc-400">{star}</span>
                  <Star className="h-3 w-3 text-zinc-500" />
                  <Progress value={(count / maxDistribution) * 100} className="h-2 flex-1 bg-zinc-800" />
                  <span className="w-10 text-right text-zinc-400">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <SellerReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}

export function SellerReviewsSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="space-y-2 text-center sm:text-left">
            <Skeleton className="mx-auto h-12 w-20 sm:mx-0" />
            <Skeleton className="mx-auto h-4 w-24 sm:mx-0" />
          </div>
          <div className="flex-1 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <SellerReviewCardSkeleton key={i} />
      ))}
    </div>
  );
}
