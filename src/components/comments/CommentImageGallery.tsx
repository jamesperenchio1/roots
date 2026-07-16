'use client'

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CommentImage } from '@/types';

interface CommentImageGalleryProps {
  images: CommentImage[];
}

export function CommentImageGallery({ images }: CommentImageGalleryProps) {
  const { t } = useTranslation(['common']);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  function next() {
    if (lightbox === null) return;
    setLightbox((lightbox + 1) % images.length);
  }

  function prev() {
    if (lightbox === null) return;
    setLightbox((lightbox - 1 + images.length) % images.length);
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightbox(idx)}
            className="relative overflow-hidden rounded-lg border border-white/5 hover:border-white/20 transition-colors"
            aria-label={t('common:comments.viewImage', { index: idx + 1 })}
          >
            <img
              src={img.url}
              alt={t('common:comments.imageAlt', { index: idx + 1 })}
              className="h-24 w-24 object-cover sm:h-28 sm:w-28"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t('common:comments.imageLightbox')}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-white/20"
            aria-label={t('common:actions.close')}
          >
            <X className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-white/20"
                aria-label={t('common:actions.previous')}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-white/20"
                aria-label={t('common:actions.next')}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={images[lightbox].url}
            alt={t('common:comments.imageAlt', { index: lightbox + 1 })}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {lightbox + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
