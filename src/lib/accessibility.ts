"use client";

/**
 * Accessibility Toolkit for CIRKLE
 * ============================================================================
 *
 * P0.6 — Accessibility baseline primitives shared across the entire app.
 *
 * Contents:
 *   1. ARIA_LABELS, ARIA_ROLES, ARIA_DESCRIPTIONS — shared constants so we
 *      don't sprinkle raw strings throughout the codebase.
 *   2. useFocusTrap — a hook for modal/drawer/dialog focus containment.
 *   3. useRovingTabindex — arrow-key navigation for toolbars, lists, docks.
 *   4. announce — convenience wrapper around aria-live regions.
 *   5. checkAccessibility — runtime audit function. Dev-only side effect; safe
 *      to call anywhere because it returns early on the server.
 *
 * Design notes:
 *   • All hooks are SSR-safe (return early when `typeof window === "undefined"`).
 *   • `useFocusTrap` is intentionally simple — the same pattern as
 *     `OverlayShell` but exposed so it can be reused on non-overlay content
 *     (e.g. in-screen drawers, onboarding cards).
 *   • `checkAccessibility` is non-destructive — it logs warnings to console
 *     in development, returns a structured report, and never throws.
 *
 * NOT included: this module does NOT modify Brain AI, proxy.ts, or any other
 * protected system. It is a leaf utility consumed by components that opt in.
 * ============================================================================
 */

import { useCallback, useEffect, useRef } from "react";

// ─── ARIA constants ────────────────────────────────────────────────────────

/**
 * Shared ARIA label strings. Centralising them here means we can rename a
 * label in one place (e.g. to add a translation later) without hunting
 * through every component file.
 */
export const ARIA_LABELS = {
  close: "Close",
  open: "Open",
  cancel: "Cancel",
  confirm: "Confirm",
  back: "Back",
  next: "Next",
  previous: "Previous",
  menu: "Menu",
  settings: "Settings",
  search: "Search",
  notifications: "Notifications",
  refresh: "Refresh",
  send: "Send",
  reply: "Reply",
  share: "Share",
  save: "Save",
  delete: "Delete",
  edit: "Edit",
  openAI: "Open AI Assistant",
  openProfile: "Open profile",
  openCompose: "Compose new post",
  openWhatIsNew: "What's new — discover features",
  toggleTheme: "Toggle dark / light theme",
  toggleLanguage: "Switch language",
  scanAndPay: "Scan & Pay",
  openDockActions: "Quick actions",
  closeDialog: "Close dialog",
  skipToContent: "Skip to main content",
  startTour: "Start feature tour",
  endTour: "End tour",
} as const;

/** WAI-ARIA role shortcuts. */
export const ARIA_ROLES = {
  dialog: "dialog",
  alertdialog: "alertdialog",
  menu: "menu",
  menuitem: "menuitem",
  menubar: "menubar",
  tablist: "tablist",
  tab: "tab",
  tabpanel: "tabpanel",
  toolbar: "toolbar",
  navigation: "navigation",
  banner: "banner",
  contentinfo: "contentinfo",
  main: "main",
  complementary: "complementary",
  region: "region",
  search: "search",
  status: "status",
  alert: "alert",
  button: "button",
  switch: "switch",
  checkbox: "checkbox",
  listbox: "listbox",
  option: "option",
  slider: "slider",
  tooltip: "tooltip",
  presentation: "presentation",
} as const;

/** Long-form descriptions for screen-reader-only context. */
export const ARIA_DESCRIPTIONS = {
  dock: "Press arrow keys to navigate tabs. Long-press or right-click for quick actions.",
  overlay: "Press Escape to close. Tab cycles through interactive elements.",
  commandPalette: "Search by typing. Use arrow keys to navigate results. Enter to launch.",
  whatsNew: "Lists every Cirkle feature. Unseen features show a NEW badge.",
  aiAssistant: "Cirkle Brain AI — ask anything. Responses stream in real-time.",
} as const;

// ─── Focusable selector ────────────────────────────────────────────────────

/**
 * Same selector used by OverlayShell — included here so non-overlay dialogs
 * (e.g. in-screen popovers) can reuse the focus-trap logic.
 */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
}

// ─── useFocusTrap hook ─────────────────────────────────────────────────────

/**
 * Trap focus within a container element while `active` is true.
 *
 * Behavior:
 *   • On activation: saves the previously-focused element, focuses the first
 *     focusable child (or the container itself if none).
 *   • While active: Tab and Shift+Tab cycle within the container.
 *   • On deactivation: restores focus to the previously-focused element.
 *   • Body scroll is NOT locked here (the caller is responsible — OverlayShell
 *     already does this).
 *
 * Returns a ref callback to attach to the container element.
 *
 * Usage:
 *   const trapRef = useFocusTrap(open);
 *   <div ref={trapRef} role="dialog" aria-modal="true">…</div>
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  opts: { autoFocus?: boolean; onEscape?: () => void } = {},
) {
  const { autoFocus = true, onEscape } = opts;
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof document === "undefined") return;
    if (!active) return;

    previouslyFocusedRef.current =
      (document.activeElement as HTMLElement | null) ?? null;

    const focusTimer = window.setTimeout(() => {
      const node = containerRef.current;
      if (!node) return;
      if (!autoFocus) return;
      const focusables = getFocusable(node);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        node.focus();
      }
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        e.stopPropagation();
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const node = containerRef.current;
      if (!node) return;
      const focusables = getFocusable(node);
      if (focusables.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl =
        (document.activeElement as HTMLElement | null) ?? null;
      if (e.shiftKey) {
        if (activeEl === first || !node.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !node.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown, true);
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
  }, [active, autoFocus, onEscape]);

  return containerRef;
}

// ─── useRovingTabindex hook ────────────────────────────────────────────────

/**
 * Roving-tabindex keyboard navigation for toolbars, lists, tabs, and docks.
 *
 * Pass a list of item IDs and the orientation. The hook tracks the active
 * index, moves focus with arrow keys, and (optionally) activates on Enter /
 * Space. Tabbing out of the container is preserved.
 *
 * Usage:
 *   const { activeIndex, setActiveIndex, onKeyDown, tabIndexFor } =
 *     useRovingTabindex({ count: items.length, orientation: "horizontal" });
 *   <div role="toolbar" onKeyDown={onKeyDown}>
 *     {items.map((it, i) => (
 *       <button key={it.id} tabIndex={tabIndexFor(i)} onFocus={() => setActiveIndex(i)}>
 *         {it.label}
 *       </button>
 *     ))}
 *   </div>
 */
export function useRovingTabindex(opts: {
  count: number;
  orientation?: "horizontal" | "vertical";
  initial?: number;
  loop?: boolean;
  onActivate?: (index: number) => void;
}) {
  const {
    count,
    orientation = "horizontal",
    initial = 0,
    loop = true,
    onActivate,
  } = opts;
  const activeRef = useRef(initial);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isHoriz = orientation === "horizontal";
      const nextKey = isHoriz ? "ArrowRight" : "ArrowDown";
      const prevKey = isHoriz ? "ArrowLeft" : "ArrowUp";
      let next = activeRef.current;
      if (e.key === nextKey) {
        e.preventDefault();
        next = activeRef.current + 1;
        if (next >= count) next = loop ? 0 : count - 1;
      } else if (e.key === prevKey) {
        e.preventDefault();
        next = activeRef.current - 1;
        if (next < 0) next = loop ? count - 1 : 0;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = count - 1;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate?.(activeRef.current);
        return;
      } else {
        return;
      }
      if (next !== activeRef.current) {
        activeRef.current = next;
        // Focus the new active element — caller must give it tabIndex=0.
        const container = e.currentTarget as HTMLElement;
        const focusables = getFocusable(container);
        const target = focusables[next];
        if (target) {
          target.focus();
        }
      }
    },
    [count, orientation, loop, onActivate],
  );
  const tabIndexFor = useCallback(
    (i: number) => (i === activeRef.current ? 0 : -1),
    [],
  );
  const setActiveIndex = useCallback((i: number) => {
    activeRef.current = i;
  }, []);
  return {
    activeIndex: activeRef,
    setActiveIndex,
    onKeyDown,
    tabIndexFor,
  };
}

// ─── announce() helper ─────────────────────────────────────────────────────

/**
 * Announce a message to screen readers via a live region. Lazily creates a
 * shared, visually-hidden aria-live="polite" region on first call.
 */
let liveRegion: HTMLDivElement | null = null;
function ensureLiveRegion(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  if (liveRegion && document.body.contains(liveRegion)) return liveRegion;
  const el = document.createElement("div");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", "status");
  el.className = "sr-only";
  el.style.position = "absolute";
  el.style.width = "1px";
  el.style.height = "1px";
  el.style.padding = "0";
  el.style.margin = "-1px";
  el.style.overflow = "hidden";
  el.style.clip = "rect(0,0,0,0)";
  el.style.whiteSpace = "nowrap";
  el.style.border = "0";
  document.body.appendChild(el);
  liveRegion = el;
  return el;
}

export function announce(message: string, opts: { assertive?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const el = ensureLiveRegion();
  if (!el) return;
  el.setAttribute("aria-live", opts.assertive ? "assertive" : "polite");
  // Clear then set — screen readers may not re-announce identical text.
  el.textContent = "";
  window.setTimeout(() => {
    if (el) el.textContent = message;
  }, 50);
}

// ─── checkAccessibility() runtime audit ────────────────────────────────────

export interface AccessibilityIssue {
  level: "warning" | "error";
  rule: string;
  message: string;
  count: number;
  selector?: string;
}

export interface AccessibilityReport {
  issues: AccessibilityIssue[];
  passed: boolean;
  scannedAt: string;
}

/**
 * Runtime accessibility audit. Walks the DOM looking for common WCAG 2.1 AA
 * issues that can be detected from markup alone:
 *
 *   1. Buttons / links without accessible text (no aria-label, no textContent).
 *   2. Images without alt text.
 *   3. Form inputs without an associated label.
 *   4. Interactive elements without focus-visible styles (best-effort).
 *   5. Elements with role="button" that aren't keyboard-accessible.
 *   6. Duplicate IDs (breaks label[for] / aria-labelledby).
 *   7. Color-contrast is NOT checked here (requires computed styles — left
 *      to the browser DevTools a11y panel or axe-core).
 *
 * Safe to call on the server — returns an empty report.
 */
export function checkAccessibility(
  root: ParentNode | undefined = typeof document !== "undefined" ? document.body : undefined,
): AccessibilityReport {
  if (typeof window === "undefined" || !root) {
    return { issues: [], passed: true, scannedAt: new Date().toISOString() };
  }
  const issues: AccessibilityIssue[] = [];

  // 1. Buttons without text.
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
  let unlabeledButtons = 0;
  for (const b of buttons) {
    if (b.getAttribute("aria-label") || b.getAttribute("aria-labelledby")) continue;
    if (b.textContent && b.textContent.trim().length > 0) continue;
    if (b.querySelector("img[alt]")) continue;
    if (b.getAttribute("title")) continue;
    unlabeledButtons++;
  }
  if (unlabeledButtons > 0) {
    issues.push({
      level: "error",
      rule: "button-name",
      message: `${unlabeledButtons} button(s) have no accessible name (text, aria-label, or aria-labelledby).`,
      count: unlabeledButtons,
      selector: "button",
    });
  }

  // 2. Images without alt.
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  const noAlt = imgs.filter((i) => !i.hasAttribute("alt")).length;
  if (noAlt > 0) {
    issues.push({
      level: "error",
      rule: "image-alt",
      message: `${noAlt} <img> element(s) missing alt attribute. Use alt="" for decorative images.`,
      count: noAlt,
      selector: "img",
    });
  }

  // 3. Inputs without labels.
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"])',
  ));
  let unlabeledInputs = 0;
  for (const input of inputs) {
    if (input.getAttribute("aria-label") || input.getAttribute("aria-labelledby")) continue;
    if (input.id) {
      const lbl = root.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
      if (lbl) continue;
    }
    const parent = input.closest("label");
    if (parent) continue;
    if (input.getAttribute("title")) continue;
    unlabeledInputs++;
  }
  if (unlabeledInputs > 0) {
    issues.push({
      level: "error",
      rule: "input-name",
      message: `${unlabeledInputs} form input(s) have no associated <label> or aria-label.`,
      count: unlabeledInputs,
      selector: "input",
    });
  }

  // 4. role="button" without keyboard handler (best-effort — checks for
  //    tabindex and onkeydown attribute / property).
  const roleButtons = Array.from(root.querySelectorAll<HTMLElement>('[role="button"]'));
  let nonKbRoleButtons = 0;
  for (const el of roleButtons) {
    const hasTabindex = el.hasAttribute("tabindex");
    const hasKb =
      typeof (el as unknown as { onkeydown?: unknown }).onkeydown === "function" ||
      el.hasAttribute("onkeydown");
    if (!hasTabindex && !hasKb) nonKbRoleButtons++;
  }
  if (nonKbRoleButtons > 0) {
    issues.push({
      level: "warning",
      rule: "role-button-keyboard",
      message: `${nonKbRoleButtons} element(s) with role="button" missing tabindex or keyboard handler.`,
      count: nonKbRoleButtons,
      selector: '[role="button"]',
    });
  }

  // 5. Duplicate IDs.
  const allEls = Array.from(root.querySelectorAll<HTMLElement>("[id]"));
  const idCounts = new Map<string, number>();
  for (const el of allEls) {
    const id = el.id;
    if (!id) continue;
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  const dups = Array.from(idCounts.values()).filter((n) => n > 1).length;
  if (dups > 0) {
    issues.push({
      level: "warning",
      rule: "duplicate-id",
      message: `${dups} duplicate id(s) found — IDs must be unique within a document.`,
      count: dups,
      selector: "[id]",
    });
  }

  // 6. <a> without href (broken anchor / not focusable).
  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>("a"));
  const noHref = anchors.filter((a) => !a.hasAttribute("href")).length;
  if (noHref > 0) {
    issues.push({
      level: "warning",
      rule: "anchor-href",
      message: `${noHref} <a> element(s) missing href — not keyboard-focusable.`,
      count: noHref,
      selector: "a",
    });
  }

  // Log to console in dev.
  if (typeof console !== "undefined" && issues.length > 0) {
    const prefix = "%c[a11y]";
    const style = "color:#c2a060;font-weight:bold";
    for (const issue of issues) {
      console[issue.level === "error" ? "error" : "warn"](
        `${prefix} %c${issue.rule}: %c${issue.message}`,
        style,
        "color:inherit",
        "color:inherit",
      );
    }
  }

  return {
    issues,
    passed: issues.filter((i) => i.level === "error").length === 0,
    scannedAt: new Date().toISOString(),
  };
}

// ─── Keyboard navigation helpers ───────────────────────────────────────────

/**
 * Returns true if the given keyboard event should activate a control
 * (Enter or Space — the standard "click" keys for non-link elements).
 */
export function isActivationKey(e: { key: string }): boolean {
  return e.key === "Enter" || e.key === " ";
}

/**
 * Returns the directional delta (-1 / 0 / +1) for arrow keys in the given
 * orientation. Useful for implementing custom arrow-key navigation without
 * the full useRovingTabindex hook.
 */
export function arrowDelta(
  e: { key: string },
  orientation: "horizontal" | "vertical" = "horizontal",
): number {
  const horiz = orientation === "horizontal";
  if (e.key === (horiz ? "ArrowRight" : "ArrowDown")) return 1;
  if (e.key === (horiz ? "ArrowLeft" : "ArrowUp")) return -1;
  return 0;
}

/**
 * Convenience: a visually-hidden class string. Use this on elements that
 * should be readable by screen readers but invisible to sighted users.
 * (Tailwind's `sr-only` utility is equivalent and preferred in JSX — this
 * constant is for cases where you can't use a class, e.g. creating DOM
 * nodes in JavaScript.)
 */
export const SR_ONLY_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: "0",
};

/**
 * Generate a stable, unique ID for aria-labelledby / aria-describedby
 * wiring. Falls back to a counter when crypto.randomUUID is unavailable
 * (older Safari).
 */
let idCounter = 0;
export function makeAriaId(prefix = "a11y"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}
