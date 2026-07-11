"use client";
import { Radio } from "lucide-react";

export function MeshBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] glass rounded-full px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
      </span>
      <Radio className="w-3 h-3 text-secondary" />
      <span className="text-foreground/80">{label}</span>
    </div>
  );
}
