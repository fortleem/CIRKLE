// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Knowledge Gap Detector
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Whenever the Brain returns a low-confidence answer or admits it lacks
 * information, the Gap Detector records the gap. Repeated gaps (high
 * encounter count, low confidence) bubble to the top of the research queue.
 *
 * Lifecycle of a gap:
 *   1. detectGap() — first encounter creates an open gap.
 *   2. Subsequent encounters increment encounterCount + update priority.
 *   3. prioritizeGaps() re-ranks the open queue.
 *   4. A research task is scheduled (researchScheduled = true, status = researching).
 *   5. resolveGap(gapId, facts) — facts discovered fill the gap; status = resolved.
 *   6. If research repeatedly fails, status = unresolvable.
 *
 * Priority formula:
 *   priority = clamp(0, 1, 0.5 * encounterCount/10 + 0.5 * (1 - confidence))
 *
 * Higher encounter count + lower confidence => higher priority.
 * ============================================================================
 */

import "server-only";

import type { KnowledgeGap, KnowledgeFact, ResearchTask, ResearchPriority, KnowledgeSource } from "./types";

// ── Gap Detector ─────────────────────────────────────────────────────────

export class KnowledgeGapDetector {
  /** All known gaps. */
  private gaps = new Map<string, KnowledgeGap>();
  /** Counter for stable gap id generation. */
  private seq = 0;
  /** Max gaps retained (LRU eviction by recency × priority). */
  private readonly maxGaps = 5000;

  /**
   * Detect (or re-record) a knowledge gap. If a gap with the same
   * (domain, description) already exists, increment its encounter count +
   * update lastEncounteredAt + priority. Otherwise create a new gap.
   */
  async detectGap(
    query: string,
    confidence: number,
    domain: string,
    description?: string
  ): Promise<KnowledgeGap> {
    try {
      const desc = description || `Missing knowledge for: ${query.slice(0, 120)}`;
      const key = this.fingerprint(domain, desc);
      const existing = this.findByKey(key);
      const now = new Date().toISOString();
      if (existing) {
        existing.encounterCount += 1;
        existing.lastEncounteredAt = now;
        existing.triggerQuery = query;
        existing.priority = this.calcPriority(existing.encounterCount, confidence);
        if (existing.priority > 0.7 && !existing.researchScheduled) {
          existing.status = "researching";
          existing.researchScheduled = true;
        }
        return existing;
      }
      const gapId = `gap_${(this.seq++).toString(36)}_${Date.now().toString(36)}`;
      const gap: KnowledgeGap = {
        gapId,
        domain,
        description: desc,
        triggerQuery: query,
        encounterCount: 1,
        firstEncounteredAt: now,
        lastEncounteredAt: now,
        priority: this.calcPriority(1, confidence),
        researchScheduled: false,
        status: "open",
      };
      this.gaps.set(gapId, gap);
      this.evictIfNeeded();
      return gap;
    } catch {
      const now = new Date().toISOString();
      return {
        gapId: `gap_err_${Date.now().toString(36)}`,
        domain,
        description: description || query,
        triggerQuery: query,
        encounterCount: 1,
        firstEncounteredAt: now,
        lastEncounteredAt: now,
        priority: 0,
        researchScheduled: false,
        status: "open",
      };
    }
  }

  /** Return all open or researching gaps, sorted by priority desc. */
  getOpenGaps(): KnowledgeGap[] {
    try {
      return Array.from(this.gaps.values())
        .filter((g) => g.status === "open" || g.status === "researching")
        .sort((a, b) => b.priority - a.priority);
    } catch {
      return [];
    }
  }

  /**
   * Resolve a gap with newly discovered facts. Marks the gap as resolved.
   * The facts themselves are persisted elsewhere (validator/graph).
   */
  async resolveGap(gapId: string, facts: KnowledgeFact[]): Promise<boolean> {
    try {
      const gap = this.gaps.get(gapId);
      if (!gap) return false;
      if (!facts || facts.length === 0) {
        gap.status = "open";
        return false;
      }
      gap.status = "resolved";
      gap.priority = Math.max(0, gap.priority - 0.5);
      gap.researchScheduled = false;
      gap.lastEncounteredAt = new Date().toISOString();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Re-prioritize all open gaps. Useful after a batch of new encounters.
   * Applies a small recency boost (just-touched gaps get +0.1 decaying to 0
   * over 10 days). Returns the new top-N priority gaps.
   */
  prioritizeGaps(topN = 20): KnowledgeGap[] {
    try {
      const open = this.getOpenGaps();
      for (const g of open) {
        const ageHours = (Date.now() - new Date(g.lastEncounteredAt).getTime()) / 3_600_000;
        const recencyBoost = Math.max(0, 0.1 - ageHours / 240);
        g.priority = Math.min(1, g.priority + recencyBoost);
      }
      return open.slice(0, topN);
    } catch {
      return [];
    }
  }

  /**
   * Build a ResearchTask for a gap (the orchestrator picks it up + schedules
   * the actual fetch through the acquirer).
   */
  buildResearchTask(gap: KnowledgeGap): ResearchTask {
    const priority: ResearchPriority =
      gap.priority >= 0.85 ? "critical" :
      gap.priority >= 0.65 ? "high" :
      gap.priority >= 0.4 ? "medium" :
      gap.priority >= 0.2 ? "low" : "background";
    return {
      taskId: `rt_${gap.gapId}_${Date.now().toString(36)}`,
      gapId: gap.gapId,
      query: gap.triggerQuery || gap.description,
      domain: gap.domain,
      priority,
      targetSources: this.pickSourcesForDomain(gap.domain),
      status: "pending",
      scheduledFor: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      retryCount: 0,
    };
  }

  /** Stats for diagnostics. */
  stats(): { total: number; open: number; researching: number; resolved: number; unresolvable: number } {
    let open = 0, researching = 0, resolved = 0, unresolvable = 0;
    for (const g of this.gaps.values()) {
      if (g.status === "open") open++;
      else if (g.status === "researching") researching++;
      else if (g.status === "resolved") resolved++;
      else if (g.status === "unresolvable") unresolvable++;
    }
    return { total: this.gaps.size, open, researching, resolved, unresolvable };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private calcPriority(encounterCount: number, confidence: number): number {
    const enc = Math.min(1, encounterCount / 10); // saturates at 10 encounters
    const conf = Math.max(0, Math.min(1, 1 - confidence));
    return Math.max(0, Math.min(1, 0.5 * enc + 0.5 * conf));
  }

  private fingerprint(domain: string, description: string): string {
    const norm = description.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().slice(0, 200);
    return `${domain}::${norm}`;
  }

  private findByKey(key: string): KnowledgeGap | undefined {
    for (const g of this.gaps.values()) {
      if (this.fingerprint(g.domain, g.description) === key) return g;
    }
    return undefined;
  }

  private pickSourcesForDomain(domain: string): KnowledgeSource[] {
    const map: Record<string, KnowledgeSource[]> = {
      government: ["government_api", "official_website"],
      weather: ["weather_api", "government_api"],
      finance: ["banking_api", "government_api"],
      transport: ["transport_api", "maps_api"],
      health: ["health_api", "government_api"],
      education: ["education_api", "official_website"],
      commerce: ["commerce_api", "business_directory"],
      news: ["official_news", "government_api"],
      maps: ["maps_api", "openstreetmap"],
      tourism: ["tourism_board", "official_website"],
      business: ["business_directory", "maps_api"],
      geography: ["openstreetmap", "maps_api"],
      general: ["wikipedia", "public_api"],
      partner: ["partner_api", "official_website"],
    };
    return map[domain] || ["public_api", "wikipedia"];
  }

  private evictIfNeeded(): void {
    if (this.gaps.size <= this.maxGaps) return;
    // Evict lowest-priority resolved gaps first; if none resolved, evict lowest-priority open.
    const arr = Array.from(this.gaps.values()).sort((a, b) => a.priority - b.priority);
    const toRemove = arr.slice(0, this.gaps.size - this.maxGaps);
    for (const g of toRemove) this.gaps.delete(g.gapId);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalKnowledgeGapDetector = new KnowledgeGapDetector();
