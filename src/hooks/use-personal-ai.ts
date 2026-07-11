/**
 * usePersonalAI — React hook wrapper around the on-device PersonalAI class.
 *
 * Loads the user's DNA, Mood, and Topic DNA on mount and exposes refresh
 * actions. Auto-triggers a DNA rebuild on first session if the DNA is stale
 * or absent (non-blocking, runs in the background).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  personalAI,
  type CirkleDNA,
  type CirkleMood,
  type TopicDNA,
  type MoodSignals,
} from "@/lib/personal-ai";

export interface UsePersonalAI {
  dna: CirkleDNA | null;
  mood: CirkleMood | null;
  topics: TopicDNA[];
  loading: boolean;
  refreshing: boolean;
  refreshMood: (signals?: MoodSignals) => Promise<void>;
  rebuildDNA: () => Promise<void>;
  refreshTopics: () => Promise<void>;
  personalAI: typeof personalAI;
}

export function usePersonalAI(): UsePersonalAI {
  const [dna, setDNA] = useState<CirkleDNA | null>(null);
  const [mood, setMood] = useState<CirkleMood | null>(null);
  const [topics, setTopics] = useState<TopicDNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [d, m, t] = await Promise.all([
        personalAI.getDNA(),
        personalAI.getMood(),
        personalAI.getTopicDNA(),
      ]);
      if (cancelled) return;
      setDNA(d);
      setMood(m);
      setTopics(t);
      setLoading(false);

      // If no DNA yet, try seeding Topic DNA from existing interests so the
      // dashboard isn't empty on first open. Then trigger a background DNA
      // rebuild so subsequent renders show a real fingerprint.
      if (!d) {
        try {
          const seeded = await personalAI.seedTopicDNAFromInterests();
          if (!cancelled && seeded.length > 0) setTopics(seeded);
        } catch {
          // ignore
        }
      }
      // Stale-or-absent DNA → background rebuild (non-blocking)
      try {
        if (await personalAI.isDNAStale()) {
          const fresh = await personalAI.rebuildDNA();
          if (!cancelled) setDNA(fresh);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshMood = useCallback(async (signals?: MoodSignals) => {
    setRefreshing(true);
    try {
      const m = await personalAI.detectMood(
        signals ?? {
          time_of_day: new Date().getHours(),
        },
      );
      setMood(m);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const rebuildDNA = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await personalAI.rebuildDNA();
      setDNA(d);
      // Topic DNA also changes when we rebuild (interests re-ranked).
      const t = await personalAI.getTopicDNA();
      setTopics(t);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const refreshTopics = useCallback(async () => {
    const t = await personalAI.getTopicDNA();
    setTopics(t);
  }, []);

  return {
    dna,
    mood,
    topics,
    loading,
    refreshing,
    refreshMood,
    rebuildDNA,
    refreshTopics,
    personalAI,
  };
}
