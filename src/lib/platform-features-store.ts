/**
 * Platform Features Client Store
 * ============================================================================
 * Zustand store that fetches the enabled platform features from
 * /api/platform-features and caches them in localStorage with a 5-minute TTL.
 *
 * Usage in components:
 *   const { isEnabled, refresh } = usePlatformFeatures();
 *   if (isEnabled("tab.pay")) { ... show Pay tab ... }
 *
 * The store hydrates on first client render and refreshes every 5 minutes.
 */

import { create } from "zustand";
import { CORE_FEATURE_IDS } from "@/lib/platform-features";

const CACHE_KEY = "cirkle-platform-features";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedFeatures {
  enabled: string[];
  fetchedAt: number;
}

function readCache(): CachedFeatures | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedFeatures;
    if (!parsed || !Array.isArray(parsed.enabled)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(enabled: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ enabled, fetchedAt: Date.now() }),
    );
  } catch {
    // ignore quota / private mode errors
  }
}

interface PlatformFeaturesState {
  enabled: Set<string>;
  hydrated: boolean;
  hydrate: () => void;
  refresh: () => Promise<void>;
  isEnabled: (id: string) => boolean;
}

export const usePlatformFeatures = create<PlatformFeaturesState>((set, get) => ({
  // Start with the core features so first render isn't empty.
  enabled: new Set(CORE_FEATURE_IDS),
  hydrated: false,

  hydrate: () => {
    if (typeof window === "undefined") return;
    if (get().hydrated) return;

    // 1. Try the cache first (instant).
    const cached = readCache();
    if (cached) {
      const isStale = Date.now() - cached.fetchedAt > CACHE_TTL_MS;
      set({ enabled: new Set(cached.enabled), hydrated: true });
      if (isStale) {
        // Refresh in the background.
        void get().refresh();
      }
      return;
    }

    // 2. No cache — fetch immediately.
    set({ hydrated: true });
    void get().refresh();
  },

  refresh: async () => {
    if (typeof window === "undefined") return;
    try {
      const res = await fetch("/api/platform-features");
      if (!res.ok) return;
      const data = await res.json();
      const enabled: string[] = data.enabled || CORE_FEATURE_IDS;
      writeCache(enabled);
      set({ enabled: new Set(enabled) });
    } catch {
      // Network error — keep the cached/defaults.
    }
  },

  isEnabled: (id: string) => {
    return get().enabled.has(id);
  },
}));

/**
 * Hook to check if a single platform feature is enabled.
 * Automatically triggers hydration on first render.
 */
export function usePlatformFeature(id: string): boolean {
  const { hydrated, hydrate, isEnabled } = usePlatformFeatures();
  if (!hydrated) hydrate();
  return isEnabled(id);
}
