"use client";
import Image from "next/image";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  loading?: "lazy" | "eager";
  key?: string | number;
}

/**
 * SmartImage wraps `next/image` with `fill` mode.
 *
 * `next/image` `fill` requires the parent element to have a non-static
 * `position` (relative/absolute/fixed). When callers pass a className that
 * already contains `absolute` or `fixed`, we render the `<Image>` directly so
 * it positions itself inside the (already-positioned) parent.
 *
 * When callers pass layout-only classes (e.g. `w-10 h-10 rounded-full
 * object-cover`), we wrap the `<Image>` in a relative-positioned `<span>` that
 * carries the sizing/shape classes. This guarantees `fill` always has a valid
 * positioned ancestor and silences the Next.js warning:
 *   "Image has 'fill' and parent element with invalid 'position'."
 */
export function SmartImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "100vw",
  loading: _loading = "lazy",
}: SmartImageProps) {
  const objectFit = className.includes("object-contain") ? "contain" : "cover";
  const isPositioned = /\b(absolute|fixed|relative)\b/.test(className);

  if (isPositioned) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={className}
        style={{ objectFit }}
        unoptimized
      />
    );
  }

  // Wrap in a relative span that carries the layout classes (size, shape,
  // shrink, etc.) so the absolutely-positioned <Image fill> has a valid
  // positioning context.
  return (
    <span className={`relative block ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`object-${objectFit}`}
        style={{ objectFit }}
        unoptimized
      />
    </span>
  );
}
