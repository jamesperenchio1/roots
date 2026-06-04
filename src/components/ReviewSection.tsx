import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { getReviewsBySeller, getReviewStats } from '@/lib/api';
import type { Review } from '@/types';

interface ReviewSectionProps {
  sellerId: string;
  compact?: boolean;
}

const ALL_TAGS = [
  'great packaging',
  'as described',
  'fast shipping',
  'healthy plant',
  'great communication',
  'would recommend',
  'shipping damage',
  'pests',
];

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${i < rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="border-b border-white/5 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium shrink-0 overflow-hidden">
          {review.reviewer?.avatar_url ? (
            <img
              src={review.reviewer.avatar_url}
              alt={review.reviewer.display_name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            review.reviewer?.display_name?.charAt(0) || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white truncate">
              {review.reviewer?.display_name || 'Anonymous'}
            </span>
            <StarRating rating={review.rating} size={12} />
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed mb-2">{review.comment}</p>
          {review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {review.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-800 text-zinc-400 border border-white/5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-zinc-600">{formatDate(review.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ReviewSection({ sellerId, compact }: ReviewSectionProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const stats = useMemo(() => getReviewStats(sellerId), [sellerId]);
  const allReviews = useMemo(() => getReviewsBySeller(sellerId), [sellerId]);

  const reviews = useMemo(() => {
    if (!activeTag) return allReviews;
    return allReviews.filter((r) => r.tags.includes(activeTag));
  }, [allReviews, activeTag]);

  const displayedReviews = compact ? reviews.slice(0, 3) : reviews;

  const maxBar = Math.max(...Object.values(stats.distribution), 1);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allReviews.forEach((r) => {
      r.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [allReviews]);

  if (stats.count === 0) {
    return (
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-medium mb-2">Reviews</h2>
        <p className="text-sm text-zinc-500">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium mb-1">
            {compact ? 'Seller Reviews' : 'Reviews'}
          </h2>
          <p className="text-sm text-zinc-500">
            {stats.count} review{stats.count !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-white">{stats.average.toFixed(1)}</div>
          <StarRating rating={Math.round(stats.average)} size={14} />
        </div>
      </div>

      {/* Distribution */}
      {!compact && (
        <div className="space-y-1.5 mb-6">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star] || 0;
            const pct = (count / maxBar) * 100;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-3">{star}</span>
                <Star className="w-3 h-3 text-zinc-600" />
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tag filters */}
      {!compact && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              activeTag === null
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
          {ALL_TAGS.filter((t) => tagCounts[t]).map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                activeTag === tag
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              {tag} ({tagCounts[tag]})
            </button>
          ))}
        </div>
      )}

      {/* Review list */}
      <div className="space-y-0">
        {displayedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {compact && reviews.length > 3 && (
        <div className="mt-4 text-center">
          <Link
            to={`/seller/${sellerId}`}
            className="text-sm text-emerald-400 hover:underline"
          >
            View all {reviews.length} reviews
          </Link>
        </div>
      )}

      {!compact && reviews.length === 0 && activeTag && (
        <p className="text-sm text-zinc-500 py-4">No reviews match this tag.</p>
      )}
    </div>
  );
}
