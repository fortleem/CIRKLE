// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Trust Ranker
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Ranks every knowledge source by authority. The ranker is consulted by:
 *   - The Validator (to weight facts by source authority).
 *   - The Acquirer (to pick the highest-authority source for a query).
 *   - The Gap Detector (to pick sources for research tasks).
 *   - The Freshness Manager (to prioritize refresh of high-authority sources).
 *
 * Baseline authority by source type:
 *   government_api        95-100   (default 98)
 *   banking_api           90-95    (default 92)
 *   official_news         85-95    (default 90)
 *   official_website      80-95    (default 88)
 *   tourism_board         80-90    (default 86)
 *   health_api            85-92    (default 88)
 *   education_api         82-90    (default 86)
 *   openstreetmap         80-90    (default 85)
 *   transport_api         78-88    (default 84)
 *   maps_api              78-88    (default 84)
 *   weather_api           78-85    (default 82)
 *   partner_api           70-85    (default 78)
 *   business_directory    65-80    (default 70)
 *   public_api            60-80    (default 70)
 *   wikipedia             65-75    (default 70)
 *   commerce_api          60-80    (default 72)
 *   platform_event        50-70    (default 60)
 *   ai_inferred           40-60    (default 50)
 *   user_generated        30-50    (default 35)
 *
 * Trust is dynamic: every successful interaction nudges trust +0.5 (capped at
 * ceiling); every failure or contradiction nudges it -1.5 (floored at floor).
 * Sources below 30 trust are quarantined (excluded from default acquisition).
 * ============================================================================
 */

import "server-only";

import type { KnowledgeSource } from "./types";

// ── Trust Ranker ─────────────────────────────────────────────────────────

interface SourceTrustRecord {
  /** Source type. */
  source: KnowledgeSource;
  /** Source URL or identifier. */
  sourceUrl: string;
  /** Domain the source covers (for top-N queries). */
  domain: string;
  /** Baseline authority (from the source type). */
  baseline: number;
  /** Current dynamic trust score (can drift from baseline). */
  trustScore: number;
  /** Number of successful interactions. */
  successes: number;
  /** Number of failed interactions. */
  failures: number;
  /** Number of contradictions contributed. */
  contradictions: number;
  /** When first registered. */
  registeredAt: string;
  /** When trust was last updated. */
  lastUpdated: string;
  /** Whether the source is quarantined (trust < 30). */
  quarantined: boolean;
}

// Baseline + floor + ceiling per source type.
const SOURCE_PROFILES: Record<KnowledgeSource, { baseline: number; floor: number; ceiling: number }> = {
  government_api: { baseline: 98, floor: 85, ceiling: 100 },
  banking_api: { baseline: 92, floor: 80, ceiling: 100 },
  official_news: { baseline: 90, floor: 75, ceiling: 98 },
  official_website: { baseline: 88, floor: 75, ceiling: 95 },
  tourism_board: { baseline: 86, floor: 70, ceiling: 95 },
  health_api: { baseline: 88, floor: 75, ceiling: 95 },
  education_api: { baseline: 86, floor: 70, ceiling: 95 },
  openstreetmap: { baseline: 85, floor: 70, ceiling: 92 },
  transport_api: { baseline: 84, floor: 65, ceiling: 92 },
  maps_api: { baseline: 84, floor: 65, ceiling: 92 },
  weather_api: { baseline: 82, floor: 65, ceiling: 90 },
  partner_api: { baseline: 78, floor: 55, ceiling: 90 },
  business_directory: { baseline: 70, floor: 50, ceiling: 85 },
  public_api: { baseline: 70, floor: 50, ceiling: 85 },
  wikipedia: { baseline: 70, floor: 55, ceiling: 80 },
  commerce_api: { baseline: 72, floor: 50, ceiling: 85 },
  platform_event: { baseline: 60, floor: 40, ceiling: 75 },
  ai_inferred: { baseline: 50, floor: 30, ceiling: 70 },
  user_generated: { baseline: 35, floor: 20, ceiling: 55 },
};

export class TrustRanker {
  /** Source trust registry keyed by sourceUrl. */
  private sources = new Map<string, SourceTrustRecord>();
  /** Sources below this trust are quarantined. */
  private readonly QUARANTINE_THRESHOLD = 30;
  /** Positive deltas are damped (successes weigh less than failures). */
  private readonly POSITIVE_DAMP = 0.5;
  /** Negative deltas are amplified (failures weigh more). */
  private readonly NEGATIVE_DAMP = -1.5;

  /**
   * Rank (or register) a source. Returns its current trust score (0-100).
   * If unknown, registers it with the baseline for its type.
   */
  rankSource(source: KnowledgeSource, sourceUrl: string, domain = "general"): number {
    try {
      const existing = this.sources.get(sourceUrl);
      if (existing) return existing.trustScore;
      const profile = SOURCE_PROFILES[source] || { baseline: 50, floor: 20, ceiling: 80 };
      const now = new Date().toISOString();
      const record: SourceTrustRecord = {
        source,
        sourceUrl,
        domain,
        baseline: profile.baseline,
        trustScore: profile.baseline,
        successes: 0,
        failures: 0,
        contradictions: 0,
        registeredAt: now,
        lastUpdated: now,
        quarantined: false,
      };
      this.sources.set(sourceUrl, record);
      return record.trustScore;
    } catch {
      return 0;
    }
  }

  /**
   * Get the authority of a source by URL. If unknown, returns the baseline
   * for its type (if type is provided) or 0.
   */
  getSourceAuthority(sourceUrl: string, sourceType?: KnowledgeSource): number {
    try {
      const existing = this.sources.get(sourceUrl);
      if (existing) return existing.trustScore;
      if (sourceType) {
        const profile = SOURCE_PROFILES[sourceType];
        return profile?.baseline || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Update a source's trust by a signed delta. Positive deltas reward
   * successful interactions; negative deltas penalize failures/contradictions.
   * Trust is clamped to the source's [floor, ceiling] range. Sources that
   * fall below the quarantine threshold are flagged.
   */
  updateSourceTrust(sourceUrl: string, delta: number, reason?: "success" | "failure" | "contradiction"): number {
    try {
      const r = this.sources.get(sourceUrl);
      if (!r) return 0;
      const profile = SOURCE_PROFILES[r.source] || { baseline: 50, floor: 20, ceiling: 80 };
      const damped = delta >= 0 ? Math.min(delta, this.POSITIVE_DAMP) : Math.max(delta, this.NEGATIVE_DAMP);
      r.trustScore = Math.max(profile.floor, Math.min(profile.ceiling, r.trustScore + damped));
      if (reason === "success") r.successes++;
      else if (reason === "failure") r.failures++;
      else if (reason === "contradiction") r.contradictions++;
      r.quarantined = r.trustScore < this.QUARANTINE_THRESHOLD;
      r.lastUpdated = new Date().toISOString();
      return r.trustScore;
    } catch {
      return 0;
    }
  }

  /**
   * Get the top-N most-trusted sources for a domain. Excludes quarantined
   * sources by default.
   */
  getTopSources(domain: string, count = 5, opts: { includeQuarantined?: boolean } = {}): SourceTrustRecord[] {
    try {
      const { includeQuarantined = false } = opts;
      const matches = Array.from(this.sources.values()).filter((s) => {
        if (s.domain !== domain) return false;
        if (!includeQuarantined && s.quarantined) return false;
        return true;
      });
      matches.sort((a, b) => b.trustScore - a.trustScore);
      return matches.slice(0, count);
    } catch {
      return [];
    }
  }

  /** Get the full record for a source. */
  getSource(sourceUrl: string): SourceTrustRecord | undefined {
    return this.sources.get(sourceUrl);
  }

  /** Get all quarantined sources (for admin review). */
  getQuarantinedSources(): SourceTrustRecord[] {
    try {
      return Array.from(this.sources.values()).filter((s) => s.quarantined);
    } catch {
      return [];
    }
  }

  /** Stats for diagnostics. */
  stats(): { total: number; quarantined: number; avgTrust: number } {
    try {
      const arr = Array.from(this.sources.values());
      const total = arr.length;
      const quarantined = arr.filter((s) => s.quarantined).length;
      const avgTrust = total === 0 ? 0 : arr.reduce((sum, s) => sum + s.trustScore, 0) / total;
      return { total, quarantined, avgTrust: Math.round(avgTrust * 10) / 10 };
    } catch {
      return { total: 0, quarantined: 0, avgTrust: 0 };
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalTrustRanker = new TrustRanker();
