'use client';

/**
 * LoadingSkeleton — Reusable skeleton loader for pages
 * Shows animated placeholder cards that match the layout structure.
 */

export function MatchCardSkeleton() {
  return (
    <div className="glass-card p-3 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="h-3 w-16 skeleton rounded" />
        <div className="h-3 w-12 skeleton rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 skeleton rounded-full" />
            <div className="h-3 w-20 skeleton rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 skeleton rounded-full" />
            <div className="h-3 w-20 skeleton rounded" />
          </div>
        </div>
        <div className="h-6 w-12 skeleton rounded" />
      </div>
    </div>
  );
}

export function GroupTableSkeleton() {
  return (
    <div className="glass-card p-3 animate-pulse">
      <div className="h-3 w-20 skeleton rounded mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-4 skeleton rounded" />
            <div className="w-4 h-4 skeleton rounded-full" />
            <div className="h-2 w-16 skeleton rounded" />
            <div className="h-2 w-6 skeleton rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card p-4 text-center animate-pulse">
      <div className="h-8 w-16 skeleton rounded mx-auto mb-2" />
      <div className="h-3 w-20 skeleton rounded mx-auto" />
    </div>
  );
}

export function PageSkeleton({ type = 'fixture' }: { type?: 'fixture' | 'live' | 'dashboard' }) {
  if (type === 'dashboard') {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="h-7 w-48 skeleton rounded mb-2" />
            <div className="h-4 w-64 skeleton rounded" />
          </div>
          <div className="h-8 w-24 skeleton rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="glass-card p-4">
          <div className="h-4 w-full skeleton rounded mb-2" />
          <div className="h-3 w-3/4 skeleton rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade-in">
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="h-7 w-48 skeleton rounded mb-2" />
          <div className="h-4 w-64 skeleton rounded" />
        </div>
        <div className="h-8 w-28 skeleton rounded" />
      </div>
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-9 skeleton rounded-lg" />
        ))}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-16 skeleton rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => <MatchCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
