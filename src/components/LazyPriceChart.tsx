'use client'

import { Suspense, lazy, useId } from 'react';
import type { ComponentProps } from 'react';
import { useInView } from '@/hooks/useInView';

const PriceChart = lazy(() => import('./PriceChart').then((m) => ({ default: m.PriceChart })));

export function LazyPriceChart(props: ComponentProps<typeof PriceChart>) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '200px', triggerOnce: true });
  const id = useId();

  return (
    <div
      ref={ref}
      id={`lazy-price-chart-${id}`}
      className="min-h-[120px]"
    >
      {inView ? (
        <Suspense
          fallback={
            <div className="h-[300px] bg-zinc-900/30 border border-white/5 rounded-xl animate-pulse" />
          }
        >
          <PriceChart {...props} />
        </Suspense>
      ) : (
        <div className="h-[300px] bg-zinc-900/30 border border-white/5 rounded-xl animate-pulse" />
      )}
    </div>
  );
}
