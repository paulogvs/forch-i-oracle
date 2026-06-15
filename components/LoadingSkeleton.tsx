/**
 * Skeleton loading placeholders for fixture and live pages.
 * Uses animate-pulse on gray placeholder bars matching the layout.
 */
import { cn } from '@/lib/utils';

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn("bg-raised/50 rounded animate-pulse", className)} />;
}

export function MatchCardSkeleton() {
  return (
    <div className="p-4 rounded-[var(--r-lg)] bg-[#1A1D24] border border-[#2A2D35]">
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex items-center gap-1.5 w-[36%] min-w-0">
          <SkeletonBar className="w-5 h-5 rounded-md shrink-0" />
          <SkeletonBar className="h-3.5 flex-1 rounded" />
        </div>
        {/* Score block */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <SkeletonBar className="w-14 h-8 rounded-[var(--r-md)]" />
          <SkeletonBar className="w-10 h-2.5 rounded" />
        </div>
        {/* Icon */}
        <SkeletonBar className="w-4 h-4 rounded shrink-0" />
        {/* Away team */}
        <div className="flex items-center gap-1.5 w-[36%] min-w-0 justify-end">
          <SkeletonBar className="h-3.5 flex-1 rounded" />
          <SkeletonBar className="w-5 h-5 rounded-md shrink-0" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5 px-1">
        <SkeletonBar className="w-16 h-2.5 rounded" />
        <SkeletonBar className="w-12 h-2.5 rounded" />
      </div>
    </div>
  );
}

export function FixtureSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i}>
          <SkeletonBar className="w-20 h-3 mb-2 rounded" />
          <div className="space-y-2">
            <MatchCardSkeleton />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveMatchSkeleton() {
  return (
    <div className="p-3 rounded-[var(--r-lg)] bg-[#1A1D24] border border-[#2A2D35]">
      <div className="flex items-center gap-2 mb-1">
        <SkeletonBar className="w-2 h-2 rounded-full shrink-0" />
        <SkeletonBar className="w-16 h-2.5 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-1">
          <SkeletonBar className="w-5 h-5 rounded-md shrink-0" />
          <SkeletonBar className="h-3.5 w-16 rounded" />
        </div>
        <SkeletonBar className="w-16 h-8 rounded-md" />
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <SkeletonBar className="h-3.5 w-16 rounded" />
          <SkeletonBar className="w-5 h-5 rounded-md shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function LiveSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <LiveMatchSkeleton key={i} />
      ))}
    </div>
  );
}

export function PendingSkeleton() {
  return (
    <div className="space-y-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center justify-between p-2.5 surface rounded-[var(--r-md)]">
          <div className="flex items-center gap-1.5 flex-1">
            <SkeletonBar className="w-5 h-5 rounded-md shrink-0" />
            <SkeletonBar className="h-3 w-16 rounded" />
          </div>
          <SkeletonBar className="w-8 h-3 rounded mx-2" />
          <div className="flex items-center gap-1.5 flex-1 justify-end">
            <SkeletonBar className="h-3 w-16 rounded" />
            <SkeletonBar className="w-5 h-5 rounded-md shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
