"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface OverlayShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "sheet" | "dialog" | "fullscreen";
  maxWidth?: string;
  /** Optional aria-label for the dialog container. */
  ariaLabel?: string;
  /** Optional id of an element that labels this dialog. Takes precedence over ariaLabel. */
  titleId?: string;
  /** Extra classes merged onto the content wrapper. */
  className?: string;
}

/**
 * Selector for elements that should be focusable inside the overlay content.
 * Hidden inputs (type=hidden) and disabled controls are excluded.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => {
    // Filter out visually hidden elements (display:none etc.)
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
}

/**
 * `<OverlayShell>` owns the shared overlay plumbing — backdrop, z-index,
 * spring animation, focus trap, aria-modal, Esc-to-close, click-outside,
 * and body scroll lock — so individual overlays can focus on their content.
 *
 * It deliberately avoids `react-focus-lock`: the focus trap is implemented
 * with a `useRef` + `keydown` handler.
 */
export function OverlayShell({
  open,
  onClose,
  children,
  variant = "dialog",
  maxWidth = "max-w-2xl",
  ariaLabel,
  titleId,
  className,
}: OverlayShellProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // On open: lock body scroll, save previous focus, focus first element.
  // On close: restore scroll, restore focus.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;
    if (!open) return;

    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Defer focus until after the content mounts so the spring animation
    // can begin and the focusables are queryable.
    const focusTimer = window.setTimeout(() => {
      const node = contentRef.current;
      if (!node) return;
      const focusables = getFocusable(node);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        // Make the container itself focusable so Esc still works even
        // when there are no interactive children.
        node.focus();
      }
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === "function") {
        try {
          prev.focus();
        } catch {
          /* no-op */
        }
      }
      previouslyFocusedRef.current = null;
    };
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Esc closes THIS overlay only — stopPropagation prevents the global
    // page-level Esc handler from also firing.
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const node = contentRef.current;
    if (!node) return;
    const focusables = getFocusable(node);
    if (focusables.length === 0) {
      e.preventDefault();
      node.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active =
      (typeof document !== "undefined" &&
        (document.activeElement as HTMLElement | null)) ||
      null;
    if (e.shiftKey) {
      if (active === first || !node.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !node.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const isSheet = variant === "sheet";
  const isFullscreen = variant === "fullscreen";

  const contentClassName = isFullscreen
    ? cn(
        "fixed inset-0 z-[150] bg-background flex flex-col outline-none",
        className,
      )
    : isSheet
      ? cn(
          "fixed inset-x-0 bottom-0 top-[4vh] z-[150] glass-strong rounded-t-3xl shadow-float overflow-hidden flex flex-col mx-auto outline-none",
          maxWidth,
          className,
        )
      : cn(
          "fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto outline-none",
          className,
        );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[140] bg-charcoal/70 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            ref={contentRef}
            initial={isFullscreen ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={isFullscreen ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={isFullscreen ? { opacity: 0 } : { y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            role="dialog"
            aria-modal="true"
            aria-label={titleId ? undefined : ariaLabel}
            aria-labelledby={titleId || undefined}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={contentClassName}
            drag={isSheet ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
          >
            {isSheet && (
              <div className="flex justify-center pt-2 pb-1 md:hidden shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>
            )}
            {variant === "dialog" ? (
              <div
                className={cn(
                  "w-full mx-auto bg-card border border-border/60 rounded-2xl shadow-float max-h-[90vh] overflow-y-auto",
                  maxWidth,
                )}
              >
                {children}
              </div>
            ) : (
              children
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
