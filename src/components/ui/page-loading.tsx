import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PageLoadingProps {
  /** Number of skeleton cards to show */
  cards?: number;
  /** Show a heading skeleton */
  heading?: boolean;
  className?: string;
}

export const PageLoading = ({ cards = 3, heading = true, className }: PageLoadingProps) => (
  <div className={cn("space-y-4 animate-fade-in", className)}>
    {heading && <Skeleton className="h-8 w-48" />}
    <div className="space-y-3">
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

interface PageLoadingGridProps {
  columns?: number;
  cards?: number;
  heading?: boolean;
  className?: string;
}

export const PageLoadingGrid = ({ columns = 2, cards = 6, heading = true, className }: PageLoadingGridProps) => (
  <div className={cn("space-y-4 animate-fade-in", className)}>
    {heading && <Skeleton className="h-8 w-48" />}
    <div className={cn("grid gap-3", {
      "grid-cols-2": columns === 2,
      "grid-cols-3": columns === 3,
      "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4": columns === 4,
    })}>
      {Array.from({ length: cards }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  </div>
);
