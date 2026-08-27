/**
 * Loading Skeletons — composite loading placeholders for Cirkle (دواير).
 *
 * This file is the canonical entry point for "show me a loading state".
 * It re-exports the low-level variants from `ui/skeleton.tsx`
 * (`SkeletonFeed`, `SkeletonList`, `SkeletonNews`, `SkeletonGrid`,
 * `SkeletonChat`, `Skeleton`) AND adds:
 *   • Generic shapes — `SkeletonCard`, `SkeletonPill`, `SkeletonRow`.
 *   • Screen-specific composites — `HomeSkeleton`, `WaslSkeleton`,
 *     `NewsSkeleton`, `ProfileSkeleton`, `MidanSkeleton`.
 *
 * Composition strategy:
 *   The screen-level skeletons are built from the low-level variants
 *   so a change to a single layout primitive propagates everywhere.
 *   Each composite renders inside a fragment with sensible vertical
 *   spacing so it can be dropped in wherever the real screen would
 *   have rendered.
 *
 * Accessibility:
 *   • Every skeleton container sets `role="status"` + `aria-live="polite"`
 *     + a screen-reader-only "loading" label so screen-reader users
 *     hear "Loading…" instead of silence.
 *   • The shimmer animation respects prefers-reduced-motion via the
 *     global CSS rule in globals.css (animation-duration: 0.01ms).
 */

import { Loader2 } from "lucide-react";
import {
  Skeleton,
  SkeletonFeed as _SkeletonFeed,
  SkeletonList as _SkeletonList,
  SkeletonNews as _SkeletonNews,
  SkeletonGrid as _SkeletonGrid,
  SkeletonChat as _SkeletonChat,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Generic building blocks
// ─────────────────────────────────────────────────────────────────────────────

/** Generic card-shaped skeleton — avatar + 2-line body + image block. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 space-y-3 shadow-soft", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/5" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="flex gap-4 pt-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

/** Pill-shaped skeleton — for tags / badges / chips. */
export function SkeletonPill({ className }: { className?: string }) {
  return <Skeleton className={cn("h-7 w-24 rounded-full", className)} />;
}

/** Single row skeleton — for list items / menu rows / search results. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
      <Skeleton className="h-6 w-12 rounded-full shrink-0" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports of low-level variants from ui/skeleton.tsx
// ─────────────────────────────────────────────────────────────────────────────

export const SkeletonFeed = _SkeletonFeed;
export const SkeletonList = _SkeletonList;
export const SkeletonNews = _SkeletonNews;
export const SkeletonGrid = _SkeletonGrid;
export const SkeletonChat = _SkeletonChat;
export { Skeleton };

// ─────────────────────────────────────────────────────────────────────────────
// Screen-specific composites
// ─────────────────────────────────────────────────────────────────────────────

/** Aria-live wrapper — every screen-level skeleton should be wrapped in
 *  this so screen readers announce "loading" instead of silence. */
function LoadingShell({
  label = "Loading…",
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("relative", className)}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Inline loading indicator — small spinner with text. Use when the
 *  skeleton shape is unknown or for very short loading windows. */
export function InlineLoading({ label = "بيحمّل…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-xs text-muted-foreground py-3", className)} role="status" aria-live="polite">
      <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** Home screen skeleton — mirrors the home dashboard's main column layout:
 *  greeting bar → composer pill → featured carousel → for-you grid →
 *  news list. Drop in where `<HomeScreen />` would render while the
 *  feed is loading. */
export function HomeSkeleton({ className }: { className?: string }) {
  return (
    <LoadingShell label="Loading home feed…" className={className}>
      <div className="space-y-8 pb-32">
        {/* Greeting + region selector */}
        <section className="px-6 pt-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
          </div>
        </section>

        {/* Composer pill */}
        <section className="px-6">
          <Skeleton className="h-12 w-full rounded-full" />
        </section>

        {/* Featured carousel */}
        <section className="px-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="shrink-0 w-[78%] sm:w-[60%] md:w-[40%] aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        </section>

        {/* For You grid */}
        <section className="px-6 space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </section>

        {/* News list */}
        <section className="px-6 space-y-3">
          <Skeleton className="h-4 w-16" />
          <div className="glass rounded-2xl overflow-hidden divide-y divide-border/60">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-none" />
            ))}
          </div>
        </section>
      </div>
    </LoadingShell>
  );
}

/** Wasl (chat) skeleton — mirrors the Wasl screen: conversation list
 *  on the left + an empty chat placeholder on the right (mobile: just
 *  the list). */
export function WaslSkeleton({ className }: { className?: string }) {
  return (
    <LoadingShell label="Loading conversations…" className={className}>
      <div className="space-y-2 p-4">
        {/* Search bar */}
        <Skeleton className="h-10 w-full rounded-full mb-3" />
        {/* Conversation rows */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </LoadingShell>
  );
}

/** News skeleton — full-width news list with category tab strip. */
export function NewsSkeleton({ className }: { className?: string }) {
  return (
    <LoadingShell label="Loading news…" className={className}>
      <div className="space-y-3 p-4">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full shrink-0" />
          ))}
        </div>
        {/* Article cards */}
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}

/** Profile skeleton — header card + grid of stats. */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <LoadingShell label="Loading profile…" className={className}>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}

/** Midan (square) skeleton — compose box + timeline of posts. */
export function MidanSkeleton({ className }: { className?: string }) {
  return (
    <LoadingShell label="Loading timeline…" className={className}>
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </LoadingShell>
  );
}

export default HomeSkeleton;
