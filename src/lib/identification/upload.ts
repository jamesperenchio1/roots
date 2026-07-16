import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { EvidenceType, UploadedMedia } from '@/types';

const IDENTIFICATION_BUCKET = 'identification-media';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/bmp', 'image/tiff'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_ARCHIVE_TYPES = ['application/zip'];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
const MAX_ARCHIVE_SIZE = 5 * 1024 * 1024;

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
  media?: UploadedMedia;
}

function mediaTypeFromMime(mime: string): UploadedMedia['media_type'] {
  if (ALLOWED_IMAGE_TYPES.includes(mime)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mime)) return 'video';
  if (ALLOWED_DOCUMENT_TYPES.includes(mime)) return 'document';
  if (ALLOWED_ARCHIVE_TYPES.includes(mime)) return 'archive';
  throw new Error(`Unsupported file type: ${mime}`);
}

function maxSizeFor(type: UploadedMedia['media_type']): number {
  switch (type) {
    case 'image': return MAX_IMAGE_SIZE;
    case 'video': return MAX_VIDEO_SIZE;
    case 'document': return MAX_DOCUMENT_SIZE;
    case 'archive': return MAX_ARCHIVE_SIZE;
  }
}

export function validateIdentificationFile(file: File): { ok: boolean; error?: string } {
  const type = file.type.toLowerCase();
  const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_ARCHIVE_TYPES];
  if (!allAllowed.includes(type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}` };
  }
  const mediaType = mediaTypeFromMime(type);
  if (file.size > maxSizeFor(mediaType)) {
    return { ok: false, error: `File too large. Max ${maxSizeFor(mediaType) / 1024 / 1024} MB for ${mediaType}.` };
  }
  return { ok: true };
}

async function ensureBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === IDENTIFICATION_BUCKET)) {
      await supabase.storage.createBucket(IDENTIFICATION_BUCKET, {
        public: true,
        fileSizeLimit: MAX_VIDEO_SIZE,
      });
    }
  } catch (e) {
    logger.warn('ensure identification bucket failed', { error: e instanceof Error ? e.message : String(e) });
  }
}

async function generateThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) return undefined;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(undefined);
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    img.src = url;
  });
}

export async function uploadIdentificationMedia(
  requestId: string,
  file: File,
  evidenceType: EvidenceType,
  onProgress?: (progress: number) => void
): Promise<UploadedMedia> {
  const validation = validateIdentificationFile(file);
  if (!validation.ok) throw new Error(validation.error);

  await ensureBucket();

  const mediaType = mediaTypeFromMime(file.type.toLowerCase());
  const ext = file.type.split('/').pop()?.replace('jpeg', 'jpg') || 'bin';
  const path = `${requestId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const thumbnail = await generateThumbnail(file);

  const { error } = await supabase.storage
    .from(IDENTIFICATION_BUCKET)
    .upload(path, file, { upsert: false });

  if (error) throw error;

  onProgress?.(100);

  const publicUrl = supabase.storage.from(IDENTIFICATION_BUCKET).getPublicUrl(path).data.publicUrl;
  const thumbnailPath = thumbnail || publicUrl;

  return {
    id: crypto.randomUUID(),
    request_id: requestId,
    file_name: file.name,
    storage_bucket: IDENTIFICATION_BUCKET,
    storage_path: path,
    mime_type: file.type,
    media_type: mediaType,
    thumbnail_path: thumbnailPath,
    preview_path: publicUrl,
    evidence_type: evidenceType,
    sort_order: 0,
    created_at: new Date().toISOString(),
    url: publicUrl,
    thumbnail_url: thumbnailPath,
  };
}

export async function uploadBatch(
  requestId: string,
  files: { file: File; evidenceType: EvidenceType }[],
  onItemProgress?: (index: number, progress: number) => void
): Promise<UploadedMedia[]> {
  return Promise.all(
    files.map(({ file, evidenceType }, index) =>
      uploadIdentificationMedia(requestId, file, evidenceType, (p) => onItemProgress?.(index, p))
    )
  );
}
