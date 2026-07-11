import * as React from "react";
import { cn } from "@/lib/utils";

interface CircleLogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  wordmarkClassName?: string;
  animated?: boolean;
}

/**
 * Cirkle (دواير) brand mark.
 * A golden ring containing four quadrant icons representing the four pillars:
 *   ─ top-left: Wasl (chat)
 *   ─ top-right: Mashahd (play / video)
 *   ─ bottom-left: Lamahat (camera / photos)
 *   ─ bottom-right: Midan (square / public square)
 */
export function CircleLogo({
  size = 40,
  className,
  withWordmark = false,
  wordmarkClassName,
  animated = false,
}: CircleLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", animated && "animate-orb-float")}
        aria-label="Cirkle logo"
        role="img"
      >
        <defs>
          <linearGradient id="circle-gold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E5C98A" />
            <stop offset="0.5" stopColor="#C2A060" />
            <stop offset="1" stopColor="#9A7A3E" />
          </linearGradient>
          <linearGradient id="circle-gold-shine" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="circle-inner-glow" cx="0.5" cy="0.5" r="0.5" gradientUnits="objectBoundingBox">
            <stop stopColor="#C2A060" stopOpacity="0.18" />
            <stop offset="1" stopColor="#C2A060" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer ring (sand-gold gradient) */}
        <circle
          cx="32"
          cy="32"
          r="29"
          stroke="url(#circle-gold)"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Soft inner glow */}
        <circle cx="32" cy="32" r="26" fill="url(#circle-inner-glow)" />
        {/* Top-left highlight */}
        <path
          d="M10 22 A 26 26 0 0 1 22 10"
          stroke="url(#circle-gold-shine)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Quadrant divider lines (subtle gold) */}
        <line x1="32" y1="9" x2="32" y2="55" stroke="#C2A060" strokeWidth="0.6" strokeOpacity="0.25" />
        <line x1="9" y1="32" x2="55" y2="32" stroke="#C2A060" strokeWidth="0.6" strokeOpacity="0.25" />

        {/* Quadrant 1 — Wasl (chat bubble), deep teal */}
        <g transform="translate(16 14)">
          <path
            d="M0 4.5C0 2.01 2.01 0 4.5 0h7C13.99 0 16 2.01 16 4.5v4c0 2.49-2.01 4.5-4.5 4.5H7l-4 3v-3H4.5C2.01 13 0 10.99 0 8.5v-4Z"
            fill="#1A4A5A"
          />
          <circle cx="5" cy="6.5" r="1" fill="#FDFCF9" />
          <circle cx="8" cy="6.5" r="1" fill="#FDFCF9" />
          <circle cx="11" cy="6.5" r="1" fill="#FDFCF9" />
        </g>

        {/* Quadrant 2 — Mashahd (play), deep teal */}
        <g transform="translate(36 16)">
          <rect x="0" y="0" width="16" height="12" rx="2.5" fill="#1A4A5A" />
          <path d="M6 3.5v5l4-2.5-4-2.5Z" fill="#FDFCF9" />
        </g>

        {/* Quadrant 3 — Lamahat (camera), deep teal */}
        <g transform="translate(16 36)">
          <rect x="0" y="2" width="16" height="11" rx="2.5" fill="#1A4A5A" />
          <rect x="4.5" y="0" width="5" height="2.5" rx="1" fill="#1A4A5A" />
          <circle cx="8" cy="7.5" r="3" fill="#FDFCF9" />
          <circle cx="8" cy="7.5" r="1.6" fill="#1A4A5A" />
          <circle cx="13" cy="4.5" r="0.8" fill="#C2A060" />
        </g>

        {/* Quadrant 4 — Midan (public square), deep teal */}
        <g transform="translate(36 36)">
          <rect x="0" y="0" width="16" height="12" rx="2" fill="#1A4A5A" />
          <rect x="2" y="2" width="5" height="5" rx="0.8" fill="#FDFCF9" />
          <rect x="9" y="2" width="5" height="5" rx="0.8" fill="#FDFCF9" opacity="0.6" />
          <rect x="2" y="9" width="12" height="1.6" rx="0.8" fill="#C2A060" />
        </g>
      </svg>
      {withWordmark && (
        <div className={cn("flex flex-col leading-none", wordmarkClassName)}>
          <span className="font-display text-[1.05em] font-semibold tracking-tight gradient-text-gold">
            Cirkle
          </span>
          <span className="font-arabic text-[0.7em] text-muted-foreground -mt-0.5">
            دواير
          </span>
        </div>
      )}
    </div>
  );
}

export function CircleLogoFavicon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width="64"
      height="64"
    >
      <defs>
        <linearGradient id="fav-gold" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E5C98A" />
          <stop offset="1" stopColor="#9A7A3E" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" stroke="url(#fav-gold)" strokeWidth="3.5" fill="#1A1A14" />
      <g transform="translate(16 14)">
        <path d="M0 4.5C0 2.01 2.01 0 4.5 0h7C13.99 0 16 2.01 16 4.5v4c0 2.49-2.01 4.5-4.5 4.5H7l-4 3v-3H4.5C2.01 13 0 10.99 0 8.5v-4Z" fill="#C2A060" />
      </g>
      <g transform="translate(36 16)"><rect width="16" height="12" rx="2.5" fill="#C2A060" /><path d="M6 3.5v5l4-2.5-4-2.5Z" fill="#1A1A14" /></g>
      <g transform="translate(16 36)"><rect y="2" width="16" height="11" rx="2.5" fill="#C2A060" /><circle cx="8" cy="7.5" r="3" fill="#1A1A14" /></g>
      <g transform="translate(36 36)"><rect width="16" height="12" rx="2" fill="#C2A060" /></g>
    </svg>
  );
}
