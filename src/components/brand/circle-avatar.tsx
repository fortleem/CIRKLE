"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CircleAvatarProps {
  initials: string;
  color?: "teal" | "rose" | "steel" | "gold" | "charcoal";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  verified?: boolean;
  online?: boolean;
  ghost?: boolean;
  className?: string;
  arabicName?: string;
}

const SIZES: Record<NonNullable<CircleAvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

const COLOR_GRADIENTS: Record<NonNullable<CircleAvatarProps["color"]>, string> = {
  teal: "from-[hsl(195_56%_33%)] to-[hsl(195_56%_18%)]",
  rose: "from-[hsl(351_51%_66%)] to-[hsl(351_51%_46%)]",
  steel: "from-[hsl(211_30%_52%)] to-[hsl(211_30%_32%)]",
  gold: "from-[hsl(39_55%_67%)] to-[hsl(39_45%_47%)]",
  charcoal: "from-[hsl(60_8%_22%)] to-[hsl(60_8%_9%)]",
};

export function CircleAvatar({
  initials,
  color = "teal",
  size = "md",
  ring = false,
  verified = false,
  online = false,
  ghost = false,
  className,
  arabicName,
}: CircleAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "relative grid place-items-center rounded-full bg-gradient-to-br text-cream font-semibold uppercase tracking-wide",
          "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2)]",
          SIZES[size],
          COLOR_GRADIENTS[color],
          ring && "ring-2 ring-[hsl(var(--gold))] ring-offset-2 ring-offset-background",
          ghost && "opacity-60 blur-[0.4px]"
        )}
        title={arabicName}
      >
        <span className="drop-shadow-sm">{initials.slice(0, 2)}</span>
      </div>
      {verified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[hsl(var(--gold))] text-[8px] font-bold text-charcoal ring-2 ring-background"
          title="Cirkle Verified"
        >
          ✓
        </span>
      )}
      {online && !ghost && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
      )}
    </div>
  );
}
