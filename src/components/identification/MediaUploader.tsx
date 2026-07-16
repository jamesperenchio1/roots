import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ImageIcon, X } from 'lucide-react';
import { uploadIdentificationMedia, validateIdentificationFile } from '@/lib/identification/upload';
import { saveUploadedMedia } from '@/lib/identification/api-identification';
import type { EvidenceType, UploadedMedia } from '@/types';
import { toast } from 'sonner';

interface Props {
  requestId: string;
  evidenceType: EvidenceType;
  label: string;
  onMediaUploaded: (media: UploadedMedia) => void;
  uploadedCount?: number;
  maxFiles?: number;
}

export function MediaUploader({ requestId, evidenceType, label, onMediaUploaded, uploadedCount = 0, maxFiles = 4 }: Props) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const disabled = !requestId || uploading;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !requestId) return;
    const remaining = maxFiles - uploadedCount;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      toast.info(t('identification.maxFiles', { maxFiles }));
      return;
    }

    setUploading(true);
    try {
      for (const file of toUpload) {
        const validation = validateIdentificationFile(file);
        if (!validation.ok) {
          toast.error(validation.error);
          continue;
        }
        const media = await uploadIdentificationMedia(requestId, file, evidenceType);
        const saved = await saveUploadedMedia(media);
        onMediaUploaded(saved);
        if (file.type.startsWith('image/')) setPreviewUrl(saved.url || null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('identification.uploadFailed'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        className={[
          'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          dragActive ? 'border-emerald-400 bg-emerald-500/5' : 'border-white/10 hover:border-white/20',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.pdf,.zip"
          multiple
          disabled={disabled}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-2" />
        ) : (
          <ImageIcon className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
        )}
        <p className="text-sm text-zinc-300">{uploading ? t('identification.uploading') : label}</p>
        <p className="text-xs text-zinc-500 mt-1">{t('identification.dragDropHint')}</p>
      </div>

      {previewUrl && (
        <div className="relative inline-block">
          <img src={previewUrl} alt={t('identification.previewAlt')} className="h-24 w-auto rounded-lg border border-white/5" />
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-1 border border-white/10"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
