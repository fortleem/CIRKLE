/**
 * Cirkle Brain — Learning Loop Hook (P1-10)
 *
 * Wires together the Brain's on-device memory (brain-memory.ts) and the
 * personalization engine (brain-personalize.ts, server-only) so that:
 *   1. Every AI assistant interaction is logged to IndexedDB.
 *   2. Thumbs-up / thumbs-down feedback is persisted against the interaction.
 *   3. After 3+ stored interactions, a personalized UserProfile can be built
 *      (delegated to /api/ai-ask with mode="build-profile" because
 *      `buildUserProfile` is `import "server-only"` and cannot run client-side).
 *
 * 100% on-device storage (IndexedDB) — only the build-profile call sends
 * recent interaction *texts* (already user-authored) to the server LLM for
 * style analysis. No third-party analytics, no remote persistence.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-store";
import {
  openBrainDB,
  logInteraction,
  saveFeedback,
  getRecentInteractions,
  type BrainInteraction,
} from "@/lib/brain-memory";

/**
 * Local shape of the personalization profile. We intentionally do NOT import
 * `UserProfile` from `@/lib/brain-personalize` here because that module is
 * marked `server-only` — even a type-only import would force the bundler to
 * resolve the module, which would throw at runtime in a client component.
 * The hook only forwards the profile between the API and the AIAssistant UI.
 */
export type BrainUserProfile = Record<string, unknown>;

export interface UseBrainLearning {
  /** IndexedDB has been opened successfully and we can read/write. */
  ready: boolean;
  /** Best-effort count of stored interactions (refreshed on mount + after each track). */
  interactionsCount: number;
  /** Persist an AI exchange to IndexedDB. Returns the new interaction id, or null on failure. */
  trackInteraction: (
    query: string,
    response: string,
    feedback?: "up" | "down",
  ) => Promise<number | null>;
  /** Persist 👍/👎 against a previously-tracked interaction. */
  trackFeedback: (interactionId: number, feedback: "up" | "down") => Promise<void>;
  /**
   * Build (or refresh) the user's personalization profile. Returns null if
   * fewer than 3 interactions are stored yet, or if the server build fails.
   */
  getUserProfile: () => Promise<BrainUserProfile | null>;
}

export function useBrainLearning(): UseBrainLearning {
  const { country } = useApp();
  const [ready, setReady] = useState(false);
  const [interactionsCount, setInteractionsCount] = useState(0);
  const countryRef = useRef(country);

  // Keep a ref of the country so async callbacks always see the latest value
  // without re-creating the callbacks on every country change.
  useEffect(() => {
    countryRef.current = country;
  }, [country]);

  // On mount, open the Brain IndexedDB and count existing interactions.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await openBrainDB();
        const recent = await getRecentInteractions(500);
        if (!cancelled) {
          setReady(true);
          setInteractionsCount(recent.length);
        }
      } catch {
        if (!cancelled) setReady(true); // degrade silently — Brain is non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trackInteraction = useCallback(
    async (
      query: string,
      response: string,
      feedback?: "up" | "down",
    ): Promise<number | null> => {
      if (!query || !response) return null;
      try {
        const c = countryRef.current || "EG";
        const id = await logInteraction({
          query,
          response,
          // Provider is "router" because the actual provider is selected by
          // the Brain Router at request time on the server. We record this
          // as a stable label so the personalization engine can group by it.
          provider: "router",
          category: "assistant",
          country: c,
          language: "en",
          latencyMs: 0,
          confidence: 1,
          timestamp: Date.now(),
          feedback: feedback === "up" ? "positive" : feedback === "down" ? "negative" : null,
        });
        setInteractionsCount((n) => n + 1);
        return id;
      } catch {
        return null;
      }
    },
    [],
  );

  const trackFeedback = useCallback(
    async (interactionId: number, feedback: "up" | "down"): Promise<void> => {
      if (!interactionId) return;
      try {
        const rating = feedback === "up" ? "positive" : "negative";
        await saveFeedback(interactionId, rating);
      } catch {
        // Best-effort — never throw from a feedback click.
      }
    },
    [],
  );

  const getUserProfile = useCallback(async (): Promise<BrainUserProfile | null> => {
    try {
      const recent = await getRecentInteractions(50);
      // Per task spec: only attempt profile building after 3+ interactions.
      // (brain-personalize's buildUserProfile has its own internal 5-row
      // threshold and will gracefully return the default profile below that.)
      if (recent.length < 3) return null;
      const c = countryRef.current || "EG";
      const interactions = recent.map((i: BrainInteraction) => ({
        query: i.query,
        response: i.response,
        category: i.category,
        feedback: i.feedback ?? undefined,
      }));
      // buildUserProfile is server-only — invoke it through the AI ask route
      // using a special mode flag. The server returns the built profile JSON.
      const res = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "build-profile",
          interactions,
          country: c,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { profile?: BrainUserProfile | null };
      return data?.profile ?? null;
    } catch {
      return null;
    }
  }, []);

  return {
    ready,
    interactionsCount,
    trackInteraction,
    trackFeedback,
    getUserProfile,
  };
}
