import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  )
}

// R4: Content-shaped skeleton variants that mirror real component layouts.

export function SkeletonFeed() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-2.5 w-1/6" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="space-y-3 p-4">
      {[0,1,2,3].map(i => (
        <div key={i} className={`flex gap-2 ${i % 2 ? "justify-end" : ""}`}>
          {i % 2 === 0 && <Skeleton className="w-8 h-8 rounded-full shrink-0" />}
          <div className="space-y-1.5 max-w-[60%]">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonNews() {
  return (
    <div className="space-y-3 p-4">
      {[0,1,2].map(i => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {Array.from({length: 9}).map((_,i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-2 p-4">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton }
