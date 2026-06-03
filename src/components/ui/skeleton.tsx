import { cn } from '@/lib/utils';

export function Skeleton({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-zinc-800',
        className
      )}
      style={style}
      {...props}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="break-inside-avoid bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
      <Skeleton className="w-full" style={{ aspectRatio: '3/4' }} />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between mt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function ListingRowSkeleton() {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="text-right space-y-2 shrink-0">
          <Skeleton className="h-3 w-16 ml-auto" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
      </div>
    </div>
  );
}
