"use client";

/**
 * Cirkle (دواير) — News socket.io hook.
 *
 * Connects to the news mini-service (port 3004) through the Caddy gateway.
 * Per gateway rules we MUST NOT use an absolute URL with a port — instead we
 * connect to "/" and pass `XTransformPort=3004` as a query param so Caddy
 * forwards the request to the news mini-service.
 *
 * Exposes a small, ergonomic API on top of the raw socket:
 *   - `socket`           raw socket.io-client instance (for `.on(...)` listeners)
 *   - `isConnected`      boolean connection state
 *   - `breaking`         array of breaking NewsArticle items received in real time
 *   - `subscribe({country, language})`  emit "subscribe" so the server routes the
 *                                       right country/language stream to this socket.
 *
 * The hook auto-subscribes on connect using the latest `country` / `language`
 * values supplied via `options`. Breaking articles emitted by the server are
 * prepended to the local `breaking` array (deduped by `sourceUrl`).
 *
 * Server events:
 *   - news:breaking   { article: NewsArticle } — prepend to breaking feed
 *   - news:emergency  { article: NewsArticle, severity } — show emergency toast
 *   - news:subscribed { country, language, lastPushAt } — ack from server
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
}

export interface BreakingPayload {
  article: NewsArticle;
}

export interface EmergencyPayload {
  article: NewsArticle;
  severity: "info" | "warning" | "critical";
}

export interface SubscribedPayload {
  country: string;
  language: string;
  lastPushAt: number;
}

export interface UseNewsSocketOptions {
  /** Country code (e.g. "SA"). Used to subscribe to the right breaking stream. */
  country?: string;
  /** Output language — "en" or "ar". Routes the socket to Arabic/English polls. */
  language?: "en" | "ar";
  /** Disable the auto-connect on mount (e.g. until the user is logged in). */
  enabled?: boolean;
  /** Max items to keep in the breaking list (default 20). */
  maxBreaking?: number;
  /** Called when an emergency alert arrives — typically used to surface a toast. */
  onEmergency?: (payload: EmergencyPayload) => void;
}

export interface UseNewsSocketResult {
  socket: Socket | null;
  isConnected: boolean;
  breaking: NewsArticle[];
  clearBreaking: () => void;
  subscribe: (country?: string, language?: "en" | "ar") => void;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

const NEWS_PORT = 3004;

export function useNewsSocket(
  options: UseNewsSocketOptions = {},
): UseNewsSocketResult {
  const {
    country,
    language = "en",
    enabled = true,
    maxBreaking = 20,
    onEmergency,
  } = options;

  // Keep latest values in refs so the socket callbacks always see the
  // current values without re-creating the socket on every prop change.
  const countryRef = useRef<string | undefined>(country);
  const languageRef = useRef<"en" | "ar">(language);
  const onEmergencyRef = useRef<typeof onEmergency>(onEmergency);
  const maxBreakingRef = useRef<number>(maxBreaking);
  useEffect(() => {
    countryRef.current = country;
  }, [country]);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  useEffect(() => {
    onEmergencyRef.current = onEmergency;
  }, [onEmergency]);
  useEffect(() => {
    maxBreakingRef.current = maxBreaking;
  }, [maxBreaking]);

  const socketRef = useRef<Socket | null>(null);
  const [socketState, setSocketState] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [breaking, setBreaking] = useState<NewsArticle[]>([]);

  useEffect(() => {
    if (!enabled) return;

    // Per Caddy gateway rules: connect to "/" with XTransformPort in the
    // query string. NEVER use an absolute URL with a port.
    const instance = io("/", {
      query: { XTransformPort: NEWS_PORT },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 8000,
      timeout: 12000,
    });
    socketRef.current = instance;

    const onConnect = () => {
      setSocketState(instance);
      setIsConnected(true);
      // Auto-subscribe with the latest country/language.
      const c = (countryRef.current || "EG").toUpperCase();
      const l = languageRef.current || "en";
      instance.emit("subscribe", { country: c, language: l });
    };
    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      // console.log("[news-socket] disconnected:", reason);
    };
    const onConnectError = (err: Error) => {
      // Silent — the mini-service may be down. The UI degrades gracefully.
      console.warn("[news-socket] connect_error:", err.message);
    };

    const onBreaking = (payload: BreakingPayload) => {
      if (!payload?.article) return;
      const article = payload.article as NewsArticle;
      setBreaking((prev) => {
        // De-dupe by sourceUrl; if seen, move to front.
        const filtered = prev.filter((a) => a.sourceUrl !== article.sourceUrl);
        const next = [article, ...filtered];
        const cap = maxBreakingRef.current > 0 ? maxBreakingRef.current : 20;
        return next.slice(0, cap);
      });
    };

    const onEmergency = (payload: EmergencyPayload) => {
      if (!payload?.article) return;
      const article = payload.article as NewsArticle;
      // Prepend to breaking feed as well.
      setBreaking((prev) => {
        const filtered = prev.filter((a) => a.sourceUrl !== article.sourceUrl);
        const next = [article, ...filtered];
        const cap = maxBreakingRef.current > 0 ? maxBreakingRef.current : 20;
        return next.slice(0, cap);
      });
      // Surface the emergency toast via the caller-provided callback.
      try {
        onEmergencyRef.current?.(payload);
      } catch (err) {
        console.warn("[news-socket] onEmergency handler threw:", err);
      }
    };

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    instance.on("connect_error", onConnectError);
    instance.on("news:breaking", onBreaking);
    instance.on("news:emergency", onEmergency);

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.off("connect_error", onConnectError);
      instance.off("news:breaking", onBreaking);
      instance.off("news:emergency", onEmergency);
      instance.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setIsConnected(false);
    };
  }, [enabled]);

  // Re-subscribe whenever country/language changes (without reconnecting).
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;
    const c = (country || "EG").toUpperCase();
    const l = language || "en";
    socket.emit("subscribe", { country: c, language: l });
  }, [country, language, isConnected]);

  const subscribe = useCallback((c?: string, l?: "en" | "ar") => {
    const socket = socketRef.current;
    if (!socket) return;
    const countryVal = (c || countryRef.current || "EG").toUpperCase();
    const langVal = l || languageRef.current || "en";
    socket.emit("subscribe", { country: countryVal, language: langVal });
  }, []);

  const clearBreaking = useCallback(() => {
    setBreaking([]);
  }, []);

  return useMemo<UseNewsSocketResult>(
    () => ({
      socket: socketState,
      isConnected,
      breaking,
      clearBreaking,
      subscribe,
    }),
    [socketState, isConnected, breaking, clearBreaking, subscribe],
  );
}
