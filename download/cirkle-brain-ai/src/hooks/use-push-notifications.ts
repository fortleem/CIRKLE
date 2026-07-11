"use client";

/**
 * Cirkle (دواير) — Push Notifications Hook
 *
 * Registers the service worker, requests notification permission,
 * and provides a function to show push notifications for breaking/emergency news.
 */

import { useEffect, useState, useCallback } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [registered, setRegistered] = useState(false);

  // Register service worker on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          setRegistered(true);
          console.log("[Cirkle] Service worker registered for push notifications");
        })
        .catch((err) => {
          console.warn("[Cirkle] SW registration failed:", err);
        });
    }

    // Read initial permission state without triggering cascading renders
    if ("Notification" in window && Notification.permission !== permission) {
      const perm = Notification.permission;
      // Use microtask to defer state update
      Promise.resolve().then(() => setPermission(perm));
    }
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied" as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // Show a notification (via SW if available, else fallback to Notification API)
  const showNotification = useCallback(
    async (opts: {
      title: string;
      body: string;
      url?: string;
      isEmergency?: boolean;
    }) => {
      if (permission !== "granted") {
        const result = await requestPermission();
        if (result !== "granted") return;
      }

      const { title, body, url, isEmergency } = opts;

      if (registered && "serviceWorker" in navigator) {
        // Use service worker for richer notifications
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          tag: isEmergency ? "cirkle-emergency" : "cirkle-news",
          data: { url: url || "/" },
          requireInteraction: isEmergency || false,
        } as NotificationOptions);
      } else if ("Notification" in window && permission === "granted") {
        // Fallback: direct Notification API
        new Notification(title, {
          body,
          icon: "/icon-192.png",
          tag: isEmergency ? "cirkle-emergency" : "cirkle-news",
        } as NotificationOptions);
      }
    },
    [permission, registered, requestPermission]
  );

  return {
    permission,
    registered,
    requestPermission,
    showNotification,
  };
}
