import { Coins } from 'lucide-react';

export function CoinSpinner({ size = 28, label }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <div style={{ perspective: 200 }}>
        <Coins size={size} className="animate-coin-spin text-gold" fill="currentColor" />
      </div>
      {label && <p className="text-sm text-bone/60">{label}</p>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`shimmer-skeleton rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-ink-600 bg-ink-800 p-5">
      <div>
        <Skeleton className="mb-4 h-12 w-12 rounded-xl" />
        <Skeleton className="mb-2 h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonPosterCard() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-ink-600 bg-ink-800">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-600 bg-ink-800 px-4 py-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-10" />
    </div>
  );
}
