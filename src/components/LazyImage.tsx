'use client'

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  aspectRatio?: string;
  priority?: boolean;
  srcSet?: string;
  sizes?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  containerClassName,
  aspectRatio,
  priority = false,
  srcSet,
  sizes,
  style,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-zinc-800',
        containerClassName
      )}
      style={aspectRatio ? { aspectRatio, ...style } : style}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-zinc-800" />}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'auto' : 'async'}
        onLoad={() => setLoaded(true)}
        className={cn(
          'transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
}
