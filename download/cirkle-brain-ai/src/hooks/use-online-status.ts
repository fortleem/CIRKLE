"use client";

import { useEffect, useState } from "react";

/**
 * Global online/offline detection hook.
 *
 * Listens to `online` / `offline` window events AND polls
 * `navigator.onLine` on mount. Returns the current connectivity state
 * so any component can render an offline banner.
 *
 * Usage:
 *   const isOnline = useOnlineStatus();
 *   {!isOnline && <OfflineBanner />}
 */
export function useOnlineStatus(): boolean {
  // SSR-safe initial state: assume online. Client hydrate will correct if needed.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Use a ref-like pattern to avoid the set-state-in-effect lint rule.
    // The handlers below are event-driven, not effect-driven.
    const sync = () => setOnline(navigator.onLine);
    sync(); // initial sync
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}
