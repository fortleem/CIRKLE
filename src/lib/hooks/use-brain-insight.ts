"use client";

/**
 * CIRKLE Brain AI — Universal Brain Hook
 * ============================================================================
 *
 * A React hook that connects ANY overlay or component to CIRKLE Brain AI.
 * This enables all 96 overlays to route intelligence through askBrain()
 * without each overlay needing its own Brain wiring.
 *
 * Usage:
 *   const { ask, loading, result } = useBrainInsight();
 *   <button onClick={() => ask({ feature: "social", action: "recommend", query: "trending" })}>
 *     Brain AI
 *   </button>
 * ============================================================================
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface BrainInsightParams {
  feature: "news" | "feed" | "chat" | "travel" | "pay" | "video" | "photos" | "social" | "profile" | "commit" | "maps" | "mail" | "health" | "safety";
  action: "search" | "summarize" | "translate" | "predict" | "recommend" | "analyze" | "generate" | "mediate";
  query: string;
  country?: string;
  city?: string;
  username?: string;
  language?: string;
}

export interface BrainInsightResult {
  answer: string;
  confidence: number;
  sources: string[];
  agreement: number;
  learnings: string[];
  recommendations?: unknown[];
  meta: {
    providerCount: number;
    latencyMs: number;
  };
}

export function useBrainInsight() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrainInsightResult | null>(null);

  const ask = useCallback(async (params: BrainInsightParams): Promise<BrainInsightResult | null> => {
    setLoading(true);
    try {
      const res = await fetch("/api/brain/cross-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature: params.feature,
          action: params.action,
          query: params.query,
          country: params.country,
          city: params.city,
          username: params.username,
          language: params.language || "en",
        }),
      });

      if (!res.ok) throw new Error(`Brain API returned ${res.status}`);

      const data = await res.json() as BrainInsightResult;
      setResult(data);
      return data;
    } catch (err) {
      toast.error("Brain AI unavailable", {
        description: String(err).slice(0, 100),
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Ask the Brain and show the result in a toast (convenience method). */
  const askWithToast = useCallback(async (params: BrainInsightParams): Promise<void> => {
    const data = await ask(params);
    if (data) {
      toast.success("Brain AI", {
        description: data.answer.slice(0, 200),
      });
    }
  }, [ask]);

  return { ask, askWithToast, loading, result };
}
