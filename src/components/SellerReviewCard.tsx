import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, ImageOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { SellerReview } from '@/types';


interface SellerReviewCardProps {
  review: SellerReview;
}

export function SellerReviewCard({ review }: SellerReviewCardProps) {
  const { t } = useTranslation(['common']);
  const reviewer = review.reviewer;
  const date = formatRelativeTime(review.created_at, t);

  const dimensions = [
    { key: 'packaging', value: review.packaging_rating },
    { key: 'plant_condition', value: review.plant_condition_rating },
    { key: 'communication', value: review.communication_rating },
    { key: 'shipping_speed', value: review.shipping_speed_rating },
    { key: 'listing_accuracy', value: review.listing_accuracy_rating },
  ].filter((d) => typeof d.value === 'number') as { key: string; value: number }[];

  return (
    <article className="rounded-xl border border-white/5 bg-zinc-900/30 p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={reviewer?.avatar_url} alt={reviewer?.display_name || ''} />
          <AvatarFallback className="bg-emerald-900/40 text-emerald-100 text-sm">
            {(reviewer?.display_name || '?').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-white">
              {reviewer?.display_name || t('common:unknownUser')}
            </span>
            {review.verified_purchase && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                {t('common:sellerReviews.verifiedBuyer')}
              </span>
            )}
            <time className="text-xs text-zinc-500" dateTime={review.created_at}>
              {date}
            </time>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                }`}
                aria-hidden="true"
              />
            ))}
            <span className="sr-only">{t('common:sellerReviews.ratingOutOf', { rating: review.rating })}</span>
          </div>
          {review.comment && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{review.comment}</p>}
          {review.would_buy_again !== undefined && (
            <p className="mt-2 text-sm text-zinc-400">
              {review.would_buy_again
                ? t('common:sellerReviews.wouldBuyAgainYes')
                : t('common:sellerReviews.wouldBuyAgainNo')}
            </p>
          )}
          {dimensions.length > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {dimensions.map((dim) => (
                <div key={dim.key} className="flex items-center justify-between text-xs">
                  <dt className="text-zinc-500">{t(`common:sellerReviews.dimensions.${dim.key}`)}</dt>
                  <dd className="flex items-center gap-0.5 text-amber-400">
                    <Star className="h-3 w-3 fill-amber-400" />
                    {dim.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {review.image_urls && review.image_urls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.image_urls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-white/5 hover:border-white/20 transition-colors"
                >
                  <ReviewImage
                    src={url}
                    alt={t('common:sellerReviews.reviewImageAlt', { index: idx + 1 })}
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ReviewImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-800">
        <ImageOff className="h-4 w-4 text-zinc-500" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
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

export function SellerReviewCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  );
}
