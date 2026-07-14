import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Upload, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { createSellerReview, uploadUserImage } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { SellerReview } from '@/types';

interface SellerReviewFormProps {
  transactionId: string;
  sellerId: string;
  reviewerId: string;
  onSubmitted?: (review: SellerReview) => void;
}

export function SellerReviewForm({ transactionId, sellerId, reviewerId, onSubmitted }: SellerReviewFormProps) {
  const { t } = useTranslation(['common']);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldBuyAgain, setWouldBuyAgain] = useState<boolean | undefined>();
  const [dimensions, setDimensions] = useState({
    packaging_rating: 0,
    plant_condition_rating: 0,
    communication_rating: 0,
    shipping_speed_rating: 0,
    listing_accuracy_rating: 0,
  });
  const [images, setImages] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dimensionKeys = [
    'packaging',
    'plant_condition',
    'communication',
    'shipping_speed',
    'listing_accuracy',
  ] as const;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const newImages: { url: string; path: string }[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadUserImage(file, reviewerId);
        const { data } = supabase.storage.from('comment-images').getPublicUrl(result.storage_path);
        newImages.push({
          url: data.publicUrl,
          path: result.storage_path,
        });
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.generic'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError(t('common:sellerReviews.ratingRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const review = await createSellerReview({
        transaction_id: transactionId,
        reviewer_id: reviewerId,
        seller_id: sellerId,
        rating,
        comment,
        would_buy_again: wouldBuyAgain,
        ...Object.fromEntries(
          Object.entries(dimensions).map(([k, v]) => [k, v > 0 ? v : undefined])
        ),
        image_urls: images.map((i) => i.url),
        verified_purchase: true,
        status: 'visible',
      } as Omit<SellerReview, 'id' | 'created_at' | 'updated_at'>);
      setRating(0);
      setComment('');
      setWouldBuyAgain(undefined);
      setDimensions({
        packaging_rating: 0,
        plant_condition_rating: 0,
        communication_rating: 0,
        shipping_speed_rating: 0,
        listing_accuracy_rating: 0,
      });
      setImages([]);
      onSubmitted?.(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/5 bg-zinc-900/30 p-4">
      <div>
        <Label className="text-zinc-300">{t('common:sellerReviews.overallRating')}</Label>
        <div className="mt-1 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i + 1)}
              className="rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={t('common:sellerReviews.rateStar', { star: i + 1 })}
            >
              <Star
                className={`h-7 w-7 ${
                  i < (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-zinc-400">
            {rating > 0 ? t('common:sellerReviews.ratingLabels.' + rating) : t('common:sellerReviews.tapToRate')}
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="seller-review-comment" className="text-zinc-300">
          {t('common:sellerReviews.writtenReview')}
        </Label>
        <Textarea
          id="seller-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('common:sellerReviews.commentPlaceholder')}
          className="mt-1 min-h-[80px] border-white/10 bg-black/30 text-white placeholder:text-zinc-600"
          maxLength={2000}
        />
      </div>

      <div>
        <Label className="text-zinc-300">{t('common:sellerReviews.wouldBuyAgain')}</Label>
        <div className="mt-1 flex gap-2">
          <Button
            type="button"
            variant={wouldBuyAgain === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWouldBuyAgain(true)}
            className={wouldBuyAgain === true ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-white/10'}
          >
            <ThumbsUp className="mr-1.5 h-4 w-4" />
            {t('common:sellerReviews.yes')}
          </Button>
          <Button
            type="button"
            variant={wouldBuyAgain === false ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWouldBuyAgain(false)}
            className={wouldBuyAgain === false ? 'bg-red-600 hover:bg-red-700' : 'border-white/10'}
          >
            <ThumbsDown className="mr-1.5 h-4 w-4" />
            {t('common:sellerReviews.no')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {dimensionKeys.map((key) => {
          const dbKey = `${key}_rating` as keyof typeof dimensions;
          const value = dimensions[dbKey];
          return (
            <div key={key}>
              <Label className="text-zinc-300">
                {t(`common:sellerReviews.dimensions.${key}`)}
              </Label>
              <div className="mt-1 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDimensions((prev) => ({ ...prev, [dbKey]: i + 1 }))}
                    className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    aria-label={t('common:sellerReviews.rateDimension', { dimension: key, star: i + 1 })}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        i < value ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDimensions((prev) => ({ ...prev, [dbKey]: 0 }))}
                  className="ml-2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  {t('common:actions.clear')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <Label className="text-zinc-300">{t('common:sellerReviews.optionalPhotos')}</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="border-white/10"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? t('common:actions.uploading') : t('common:actions.upload')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          {images.map((img, idx) => (
            <div key={idx} className="relative h-14 w-14 overflow-hidden rounded-lg border border-white/10">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600"
                aria-label={t('common:actions.remove')}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={submitting || rating === 0}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        {submitting ? t('common:actions.saving') : t('common:sellerReviews.submitReview')}
      </Button>
    </form>
  );
}

export function SellerReviewFormSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-white/5 bg-zinc-900/30 p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
