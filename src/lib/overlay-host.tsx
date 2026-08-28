// @ts-nocheck
/**
 * CIRKLE — Registry-Driven Overlay Host
 * ============================================================================
 * Auto-wires overlays from the registry, eliminating the need to manually
 * add `useState` + `addEventListener` + render JSX for each overlay in
 * `page.tsx`.
 *
 * Today `page.tsx` declares ~154 individual `useState` hooks, ~151
 * `addEventListener` calls, and ~150 mount points. With `createOverlayHost`
 * the wiring collapses to:
 *
 *   const overlayHost = createOverlayHost({
 *     overlays: OVERLAY_REGISTRY.map(entry => ({
 *       event: entry.event,
 *       loader: () => import(`@/components/overlays/${entry.id}.tsx`),
 *     })),
 *   });
 *   // In component:
 *   <overlayHost.OverlayHost />
 *
 * The host:
 *   • Creates a single `Map<string, boolean>` for open/close state
 *   • Registers all event listeners in ONE `useEffect`
 *   • Dynamically imports + renders ONLY the overlay that's currently open
 *   • Forwards `getProps(eventId)` to each overlay as additional props
 *   • Cleans up every listener on unmount
 *
 * This is a CLIENT-ONLY API. The host is created outside React for sharing
 * the imperative `openOverlay` / `closeOverlay` / `isOpen` accessors.
 * ============================================================================
 */

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface OverlayHostEntry {
  /** The window CustomEvent name that opens this overlay. */
  event: string;
  /** Dynamic import returning the overlay's default React component. */
  loader: () => Promise<{ default: ComponentType<any> }>;
  /**
   * Optional: a different event name that closes this overlay. Defaults
   * to `${event}:close`.
   */
  closeEvent?: string;
}

export interface OverlayHostConfig {
  /** Map of event name → dynamic import loader. */
  overlays: OverlayHostEntry[];
  /**
   * Optional: returns additional props to pass to the overlay, given the
   * event id and the event detail payload.
   */
  getProps?: (eventId: string, detail?: any) => Record<string, any>;
}

export interface OverlayHostAPI {
  /** React component that renders every overlay. Mount once near the root. */
  OverlayHost: React.FC;
  /** Imperatively open the overlay registered for `eventId`. */
  openOverlay: (eventId: string) => void;
  /** Imperatively close the overlay registered for `eventId`. */
  closeOverlay: (eventId: string) => void;
  /** Returns true when the overlay is currently open. */
  isOpen: (eventId: string) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: lazy module cache (so we don't re-import on every open)
// ─────────────────────────────────────────────────────────────────────────────

interface CachedComponent {
  Component: ComponentType<any> | null;
  loading: boolean;
  error: Error | null;
}

const moduleCache = new Map<string, CachedComponent>();

async function loadComponent(
  eventId: string,
  loader: () => Promise<{ default: ComponentType<any> }>,
): Promise<ComponentType<any>> {
  const cached = moduleCache.get(eventId);
  if (cached?.Component) return cached.Component;
  if (cached?.loading) {
    // Wait for in-flight load — poll on next microtask.
    await new Promise((r) => setTimeout(r, 16));
    return loadComponent(eventId, loader);
  }

  moduleCache.set(eventId, { Component: null, loading: true, error: null });
  try {
    const mod = await loader();
    const Component = mod.default;
    moduleCache.set(eventId, { Component, loading: false, error: null });
    return Component;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    moduleCache.set(eventId, { Component: null, loading: false, error });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createOverlayHost — the factory
// ─────────────────────────────────────────────────────────────────────────────

export function createOverlayHost(config: OverlayHostConfig): OverlayHostAPI {
  const { overlays, getProps } = config;

  // Map event-name → entry (for O(1) lookup).
  const entryByEvent = new Map<string, OverlayHostEntry>();
  for (const entry of overlays) {
    entryByEvent.set(entry.event, entry);
  }

  // ── Internal open-state store (one Map instead of N useState calls) ────
  // We use a tiny pub/sub so React components can subscribe without re-rendering
  // the entire tree on every open/close toggle.
  const state = new Map<string, boolean>();
  const detailStore = new Map<string, any>();
  const listeners = new Set<() => void>();

  function emitChange() {
    for (const l of listeners) l();
  }

  function setOpen(eventId: string, open: boolean, detail?: any) {
    const prev = state.get(eventId) ?? false;
    if (prev === open && detail === undefined) return;
    state.set(eventId, open);
    if (detail !== undefined) {
      detailStore.set(eventId, detail);
    } else if (!open) {
      detailStore.delete(eventId);
    }
    emitChange();
  }

  // ── Imperative accessors ─────────────────────────────────────────────
  const openOverlay = (eventId: string) => setOpen(eventId, true);
  const closeOverlay = (eventId: string) => setOpen(eventId, false);
  const isOpen = (eventId: string) => state.get(eventId) ?? false;

  // ── React hook: subscribe to the store ───────────────────────────────
  function useOverlayState(): [Map<string, boolean>, Map<string, any>] {
    const [, force] = useState(0);
    useEffect(() => {
      const l = () => force((n) => n + 1);
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    }, []);
    return [state, detailStore];
  }

  // ── The OverlayHost React component ───────────────────────────────────
  const OverlayHost: React.FC = function OverlayHostImpl() {
    const [openMap, detailMap] = useOverlayState();

    // Register ALL event listeners in a single useEffect (instead of 151
    // separate addEventListener calls).
    useEffect(() => {
      const handlers: Array<{ event: string; closeEvent?: string; fn: (e: Event) => void }> = [];

      for (const entry of overlays) {
        const fn = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          // Detail shape: `{ open: boolean }` or arbitrary payload.
          if (detail && typeof detail === "object" && "open" in detail) {
            setOpen(entry.event, Boolean((detail as any).open), detail);
          } else {
            // Default: toggle open.
            setOpen(entry.event, true, detail);
          }
        };
        const closeFn = (e: Event) => {
          setOpen(entry.event, false, (e as CustomEvent).detail);
        };
        window.addEventListener(entry.event, fn as EventListener);
        if (entry.closeEvent) {
          window.addEventListener(entry.closeEvent, closeFn as EventListener);
        } else {
          window.addEventListener(`${entry.event}:close`, closeFn as EventListener);
        }
        handlers.push({ event: entry.event, closeEvent: entry.closeEvent ?? `${entry.event}:close`, fn: closeFn });
        // Stash the open fn for cleanup — we'll just remove both.
        (handlers[handlers.length - 1] as any)._openFn = fn;
      }

      return () => {
        for (const h of handlers) {
          window.removeEventListener(h.event, (h as any)._openFn as EventListener);
          window.removeEventListener(h.closeEvent!, h.fn as EventListener);
        }
      };
      // We deliberately run this effect ONCE — the overlay list is static
      // for the lifetime of the host.
    }, []);

    // Collect the set of currently-open overlays.
    const openEntries = useMemo(() => {
      const list: Array<{ entry: OverlayHostEntry; detail: any }> = [];
      for (const entry of overlays) {
        if (openMap.get(entry.event)) {
          list.push({ entry, detail: detailMap.get(entry.event) });
        }
      }
      return list;
    }, [openMap, detailMap, overlays]);

    return (
      <>
        {openEntries.map(({ entry, detail }) => (
          <LazyOverlay
            key={entry.event}
            eventId={entry.event}
            loader={entry.loader}
            detail={detail}
            getProps={getProps}
            onClose={() => setOpen(entry.event, false)}
          />
        ))}
      </>
    );
  };

  return { OverlayHost, openOverlay, closeOverlay, isOpen };
}

// ─────────────────────────────────────────────────────────────────────────────
// LazyOverlay — single overlay's dynamic import + render
// ─────────────────────────────────────────────────────────────────────────────

interface LazyOverlayProps {
  eventId: string;
  loader: () => Promise<{ default: ComponentType<any> }>;
  detail: any;
  getProps?: (eventId: string, detail?: any) => Record<string, any>;
  onClose: () => void;
}

const LazyOverlay: React.FC<LazyOverlayProps> = function LazyOverlayImpl({
  eventId,
  loader,
  detail,
  getProps,
  onClose,
}) {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    loadComponent(eventId, loader)
      .then((C) => {
        if (!cancelled && mountedRef.current) {
          setComponent(() => C);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled && mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [eventId, loader]);

  // Compose props: { open: true, onClose } + getProps(eventId, detail).
  const extraProps = useMemo(() => {
    try {
      return getProps ? getProps(eventId, detail) : {};
    } catch {
      return {};
    }
  }, [eventId, detail, getProps]);

  if (error) {
    // Render a minimal fallback so the user can at least close the overlay.
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`Overlay ${eventId} failed to load`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.5)",
        }}
        >
          <div
            style={{
              background: "#1f1f23",
              color: "#fafafa",
              padding: 24,
              borderRadius: 12,
              maxWidth: 400,
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Overlay failed to load</p>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
              {eventId}: {error.message}
            </p>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
    );
  }

  if (!Component) {
    // Render nothing — overlay will pop in once the module is imported.
    // (Next.js dynamic import is fast — typically <50ms.)
    return null;
  }

  return (
    <Component
      open={true}
      onClose={onClose}
      detail={detail}
      {...extraProps}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: build an OverlayHostConfig from the existing OVERLAY_REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper that converts an `OVERLAY_REGISTRY` array into the
 * `OverlayHostConfig.overlays` shape. Each overlay's loader dynamic-imports
 * `@/components/overlays/{id}.tsx`.
 *
 * Usage:
 *   import { OVERLAY_REGISTRY } from "@/lib/overlay-registry";
 *   import { createOverlayHost, fromRegistry } from "@/lib/overlay-host";
 *   const host = createOverlayHost({ overlays: fromRegistry(OVERLAY_REGISTRY) });
 */
export function fromRegistry(
  entries: Array<{ id: string; event: string }>,
): OverlayHostEntry[] {
  return entries.map((e) => ({
    event: e.event,
    loader: () => import(`@/components/overlays/${e.id}.tsx`),
  }));
}
