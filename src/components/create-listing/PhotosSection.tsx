'use client'

import { useTranslation } from 'react-i18next';
import { Camera, CheckCircle, X } from 'lucide-react';

interface PhotoItem {
  file: File;
  preview: string;
}

interface PhotosSectionProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  photos: PhotoItem[];
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  error?: string;
}

export default function PhotosSection({
  fileInputRef,
  photos,
  onFiles,
  onRemove,
  error,
}: PhotosSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);
  const count = photos.length;

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{t('marketplace:create.photosLabel')}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="grid grid-cols-5 gap-2">
        {photos.map((p, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-500/50 group"
          >
            <img
              src={p.preview}
              alt={t('marketplace:create.photoAlt', { index: i + 1 })}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={t('common:actions.remove')}
            >
              <X className="w-3 h-3 text-white" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center text-emerald-400 py-0.5">
                {t('marketplace:create.mainPhoto')}
              </span>
            )}
          </div>
        ))}
        {photos.length < 10 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <Camera className="w-5 h-5 text-zinc-600" />
            <span className="text-[10px] text-zinc-600">{t('marketplace:create.addPhoto')}</span>
          </button>
        )}
      </div>
      {count > 0 && (
        <p className="text-xs text-emerald-400/80 mt-1 inline-flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> {t('marketplace:create.photosReady', { count })}
        </p>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
