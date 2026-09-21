'use client';

import type { ReactNode } from 'react';
import { useInView } from '@/hooks/useInView';

interface LazyMountProps {
  children: ReactNode;
  /** Rendered until the content scrolls into view. */
  placeholder?: ReactNode;
  className?: string;
}

/**
 * Defers mounting children until they scroll near the viewport.
 *
 * Used for widgets that trigger external network requests on mount (weather,
 * plant care), so a listing page does not fire them before the user can even
 * see the widget.
 */
export function LazyMount({ children, placeholder = null, className }: LazyMountProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div ref={ref} className={className}>
      {inView ? children : placeholder}
    </div>
  );
}

export default LazyMount;
