import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createReview } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface ReviewFormProps {
  transactionId: string;
  listingId: string;
  sellerId: string;
  onSubmitted: () => void;
}

const TAG_OPTIONS = [
  'great packaging',
  'as described',
  'fast shipping',
  'healthy plant',
  'great communication',
  'would recommend',
  'shipping damage',
  'pests',
];

export default function ReviewForm({ transactionId, listingId, sellerId, onSubmitted }: ReviewFormProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info('Log in to leave a review.');
      return;
    }
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }
    if (comment.trim().length < 20) {
      toast.error('Comment must be at least 20 characters.');
      return;
    }

    setLoading(true);
    try {
      await createReview({
        transaction_id: transactionId,
        listing_id: listingId,
        reviewer_id: user.id,
        seller_id: sellerId,
        rating,
        comment: comment.trim(),
        tags: selectedTags,
      });
      toast.success('Review submitted!');
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
      <h3 className="text-sm font-medium mb-4">Leave a Review</h3>

      {/* Star rating */}
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: 5 }, (_, i) => {
          const starValue = i + 1;
          const isActive = starValue <= (hoverRating || rating);
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => setRating(starValue)}
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm text-zinc-500">
          {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Select a rating'}
        </span>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this seller... (min 20 characters)"
          rows={4}
          className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
        />
        <p className={`text-xs mt-1 ${comment.trim().length < 20 ? 'text-zinc-600' : 'text-emerald-400'}`}>
          {comment.trim().length} / 20+ characters
        </p>
      </div>

      {/* Tags */}
      <div className="mb-4">
        <p className="text-xs text-zinc-500 mb-2">Select tags (optional)</p>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading}
        className="bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-xl"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Submit Review
      </Button>
    </form>
  );
}
