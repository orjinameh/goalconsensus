"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface-3 shimmer-bg",
        className
      )}
    />
  );
}

export function MatchCardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-surface-2 border border-border-subtle rounded-xl p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-16 h-5 rounded-full" />
        <Skeleton className="w-8 h-4" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 text-right pr-3">
          <Skeleton className="w-24 h-4 ml-auto" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8" />
          <Skeleton className="w-3 h-3" />
          <Skeleton className="w-8 h-8" />
        </div>
        <div className="flex-1 pl-3">
          <Skeleton className="w-24 h-4" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
        <Skeleton className="w-16 h-3" />
        <Skeleton className="w-10 h-3" />
      </div>
    </div>
  );
}

export function ConsensusSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col items-center gap-4 py-8">
        <Skeleton className="w-28 h-8 rounded-full" />
        <Skeleton className="w-32 h-32 rounded-full" />
        <Skeleton className="w-48 h-4" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      <div className="space-y-3">
        <Skeleton className="w-20 h-4" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}
