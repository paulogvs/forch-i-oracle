'use client';

import { cn } from '@/lib/utils';

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-elevated rounded-lg', className)} />
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border-subtle">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 w-[36%]">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
        <Skeleton className="w-16 h-10 rounded-lg" />
        <div className="flex items-center gap-1.5 w-[36%] justify-end">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function GroupTableSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border-subtle">
      <Skeleton className="h-4 w-20 mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border-subtle">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border-subtle">
      <Skeleton className="w-8 h-8 rounded-lg mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function BracketMatchSkeleton() {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border-subtle">
      <div className="flex items-center gap-1.5 w-[40%]">
        <Skeleton className="w-5 h-5 rounded-full" />
        <Skeleton className="h-3 flex-1" />
      </div>
      <Skeleton className="w-12 h-5 rounded" />
      <div className="flex items-center gap-1.5 w-[40%] justify-end">
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="w-5 h-5 rounded-full" />
      </div>
    </div>
  );
}
