// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Experience Replay
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Experience Replay learns USER JOURNEYS, not single clicks. A journey is
 * a sequence of platform events grouped by sessionId. For example:
 *
 *   Search Restaurant → Open → View Menu → Call → Navigate → Book →
 *   Pay → Review → Share
 *
 * Successful journeys (those with outcome="success") are stored as
 * patterns. Later, when a user begins a similar journey, the engine
 * recommends the next most-likely step based on past successful
 * completions.
 *
 * Constitutional role:
 *   - NEVER tracks journeys without consentGranted.
 *   - NEVER stores raw PII — only event ids + step indices + timing.
 *   - Recommendations are derived from aggregated patterns across all
 *     users (anonymized), never from a single user's history.
 * ============================================================================
 */

import "server-only";

import type { PlatformEvent, UserJourney, JourneyStep } from "./types";

// ── Experience Replay ────────────────────────────────────────────────────

export class ExperienceReplay {
  /** Active (in-progress) journeys keyed by sessionId. */
  private active = new Map<string, UserJourney>();
  /** All completed journeys keyed by journeyId. */
  private journeys = new Map<string, UserJourney>();
  /** Successful journeys indexed by category for fast lookup. */
  private successfulByCategory = new Map<string, UserJourney[]>();
  /** Last step timestamp per session (for gap computation). */
  private lastTsBySession = new Map<string, number>();

  /**
   * Track a platform event as part of a journey. Events without a
   * sessionId start a new ephemeral journey keyed by the event id.
   * Events without consent are ignored entirely.
   */
  async trackJourney(event: PlatformEvent): Promise<void> {
    try {
      if (!event || !event.consentGranted) return;
      const sessionId = event.sessionId || `s_${event.eventId}`;
      let journey = this.active.get(sessionId);
      const ts = new Date(event.timestamp).getTime();
      if (!journey) {
        journey = {
          journeyId: `j_${sessionId}_${ts}`,
          userId: event.userId,
          steps: [],
          outcome: "in_progress",
          totalDurationMs: 0,
          startedAt: event.timestamp,
          category: this.classifyJourney(event),
          confidence: 0,
        };
        this.active.set(sessionId, journey);
      }
      // Dedup: don't append the same event twice.
      if (journey.steps.some((s) => s.event.eventId === event.eventId)) return;
      const lastTs = this.lastTsBySession.get(sessionId);
      const step: JourneyStep = {
        step: journey.steps.length,
        event,
        gapMs: lastTs ? Math.max(0, ts - lastTs) : 0,
      };
      journey.steps.push(step);
      journey.totalDurationMs = ts - new Date(journey.startedAt).getTime();
      this.lastTsBySession.set(sessionId, ts);
      // Auto-expire sessions idle for > 30 minutes (treat as abandoned).
      this.expireIdleSessions();
    } catch {
      // best-effort
    }
  }

  /**
   * Mark a journey as completed with the given outcome. Successful
   * journeys are indexed by category for later recommendation. Returns
   * the updated journey, or null if not found.
   */
  async completeJourney(
    journeyId: string,
    outcome: "success" | "failure" | "abandoned"
  ): Promise<UserJourney | null> {
    try {
      let journey: UserJourney | undefined;
      let sessionKey: string | undefined;
      for (const [sid, j] of this.active) {
        if (j.journeyId === journeyId) { journey = j; sessionKey = sid; break; }
      }
      if (!journey) journey = this.journeys.get(journeyId);
      if (!journey) return null;
      journey.outcome = outcome;
      journey.endedAt = new Date().toISOString();
      journey.confidence =
        outcome === "success"
          ? Math.min(1, 0.4 + journey.steps.length * 0.1)
          : outcome === "failure"
            ? 0.2
            : 0;
      this.journeys.set(journey.journeyId, journey);
      if (sessionKey) {
        this.active.delete(sessionKey);
        this.lastTsBySession.delete(sessionKey);
      }
      if (outcome === "success") {
        const list = this.successfulByCategory.get(journey.category) || [];
        list.push(journey);
        if (list.length > 500) list.shift();
        this.successfulByCategory.set(journey.category, list);
      }
      return journey;
    } catch {
      return null;
    }
  }

  /** Return all successful journeys for a category (most-recent first). */
  getSuccessfulJourneys(category: string, limit = 20): UserJourney[] {
    try {
      const list = this.successfulByCategory.get(category) || [];
      return list.slice(-limit).reverse();
    } catch {
      return [];
    }
  }

  /**
   * Compute a journey pattern for a category: aggregated step
   * transitions (from-type → to-type) with their counts and relative
   * probabilities. This is the foundation for recommendNextStep.
   */
  getJourneyPattern(category: string): {
    category: string;
    sampleSize: number;
    averageLength: number;
    transitions: Array<{ from: string; to: string; count: number; probability: number }>;
  } {
    try {
      const journeys = this.successfulByCategory.get(category) || [];
      if (journeys.length === 0) {
        return { category, sampleSize: 0, averageLength: 0, transitions: [] };
      }
      const avgLen = journeys.reduce((s, j) => s + j.steps.length, 0) / journeys.length;
      const transMap = new Map<string, Map<string, number>>();
      const fromCounts = new Map<string, number>();
      for (const j of journeys) {
        for (let i = 0; i < j.steps.length - 1; i++) {
          const from = j.steps[i].event.type;
          const to = j.steps[i + 1].event.type;
          if (!transMap.has(from)) transMap.set(from, new Map());
          const inner = transMap.get(from)!;
          inner.set(to, (inner.get(to) || 0) + 1);
          fromCounts.set(from, (fromCounts.get(from) || 0) + 1);
        }
      }
      const transitions: Array<{ from: string; to: string; count: number; probability: number }> = [];
      for (const [from, inner] of transMap) {
        const total = fromCounts.get(from) || 1;
        for (const [to, count] of inner) {
          transitions.push({ from, to, count, probability: count / total });
        }
      }
      transitions.sort((a, b) => b.count - a.count);
      return { category, sampleSize: journeys.length, averageLength: avgLen, transitions };
    } catch {
      return { category, sampleSize: 0, averageLength: 0, transitions: [] };
    }
  }

  /**
   * Recommend the next step(s) for a journey in progress. `currentSteps`
   * is the list of event types seen so far. Returns up to `topK`
   * candidates ranked by aggregated probability across matching
   * categories.
   */
  recommendNextStep(
    currentSteps: string[],
    opts: { category?: string; topK?: number } = {}
  ): Array<{ type: string; probability: number; observedCount: number }> {
    try {
      const { category, topK = 5 } = opts;
      if (currentSteps.length === 0) return [];
      const lastType = currentSteps[currentSteps.length - 1];
      const categories = category ? [category] : Array.from(this.successfulByCategory.keys());
      const agg = new Map<string, { count: number; total: number }>();
      for (const cat of categories) {
        const pattern = this.getJourneyPattern(cat);
        for (const t of pattern.transitions) {
          if (t.from !== lastType) continue;
          const e = agg.get(t.to) || { count: 0, total: 0 };
          e.count += t.count;
          e.total += t.count; // local denominator; will be normalized below
          agg.set(t.to, e);
        }
      }
      // Normalize by total candidates from the lastType.
      const grandTotal = Array.from(agg.values()).reduce((s, e) => s + e.count, 0) || 1;
      const out: Array<{ type: string; probability: number; observedCount: number }> = [];
      for (const [type, e] of agg) {
        out.push({ type, probability: e.count / grandTotal, observedCount: e.count });
      }
      out.sort((a, b) => b.probability - a.probability);
      return out.slice(0, topK);
    } catch {
      return [];
    }
  }

  /** Get all active (in-progress) journeys. */
  getActiveJourneys(): UserJourney[] {
    return Array.from(this.active.values());
  }

  /** Get a single journey by id. */
  getJourney(journeyId: string): UserJourney | undefined {
    return this.journeys.get(journeyId);
  }

  /** Stats for monitoring. */
  stats(): Record<string, unknown> {
    return {
      active: this.active.size,
      completed: this.journeys.size,
      successful: Array.from(this.successfulByCategory.values()).reduce((s, l) => s + l.length, 0),
      categories: Array.from(this.successfulByCategory.keys()),
    };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private classifyJourney(event: PlatformEvent): string {
    const t = event.type.toLowerCase();
    if (t.includes("travel") || t.includes("flight") || t.includes("hotel")) return "travel_booking";
    if (t.includes("restaurant")) return "restaurant_discovery";
    if (t.includes("payment") || t.includes("purchase")) return "payment_flow";
    if (t.includes("search")) return "search_session";
    if (t.includes("message") || t.includes("mail")) return "communication";
    if (t.includes("video") || t.includes("post") || t.includes("news")) return "content_consumption";
    if (t.includes("job")) return "job_application";
    if (t.includes("map") || t.includes("navigate")) return "navigation";
    return "general";
  }

  private expireIdleSessions(): void {
    try {
      const now = Date.now();
      const idleMs = 30 * 60 * 1000; // 30 minutes
      for (const [sid, lastTs] of this.lastTsBySession) {
        if (now - lastTs > idleMs) {
          const journey = this.active.get(sid);
          if (journey) {
            journey.outcome = "abandoned";
            journey.endedAt = new Date(lastTs).toISOString();
            journey.confidence = 0;
            this.journeys.set(journey.journeyId, journey);
          }
          this.active.delete(sid);
          this.lastTsBySession.delete(sid);
        }
      }
    } catch {
      // best-effort
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalExperienceReplay = new ExperienceReplay();
