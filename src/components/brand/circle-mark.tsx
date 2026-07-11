"use client";
import { motion } from "framer-motion";

export function CircleMark({ size = 40, animated = true }: { size?: number; animated?: boolean }) {
  const Wrap = animated ? motion.svg : "svg";
  const props = animated ? { animate: { rotate: 360 }, transition: { duration: 30, repeat: Infinity, ease: "linear" as const } } : {};
  return (
    <Wrap width={size} height={size} viewBox="0 0 100 100" fill="none" {...(props as any)}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--gold))" />
          <stop offset="50%" stopColor="hsl(var(--rose))" />
          <stop offset="100%" stopColor="hsl(var(--teal))" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="32" r="22" stroke="url(#cg)" strokeWidth="1.5" opacity="0.9" />
      <circle cx="32" cy="60" r="22" stroke="url(#cg)" strokeWidth="1.5" opacity="0.9" />
      <circle cx="68" cy="60" r="22" stroke="url(#cg)" strokeWidth="1.5" opacity="0.9" />
      <circle cx="50" cy="50" r="6" fill="url(#cg)" />
    </Wrap>
  );
}
