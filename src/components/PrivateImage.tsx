'use client';

import { useEffect, useState } from 'react';
import { getPrivateFileUrl } from '@/lib/api';

interface PrivateImageProps {
  bucket: 'receipt-photos' | 'dispute-evidence';
  /** Bare object path (preferred) or a legacy URL ending in the object path. */
  path: string;
  alt: string;
  className?: string;
}

/** Renders an image from a private storage bucket via a short-lived signed URL. */
export function PrivateImage({ bucket, path, alt, className }: PrivateImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPrivateFileUrl(bucket, path)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(null); });
    return () => { cancelled = true; };
  }, [bucket, path]);

  if (!src) return <div className={`${className ?? ''} bg-zinc-800 animate-pulse`} aria-hidden="true" />;
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />;
}
