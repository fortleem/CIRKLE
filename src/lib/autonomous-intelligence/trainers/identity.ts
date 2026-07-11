// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Identity Domain Trainer (Privacy-First)
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns identity/verification patterns across Circle Verify. This trainer is
 * PRIVACY-FIRST by constitutional requirement — only learns from events where
 * the user has explicitly consented to identity learning.
 *
 * Learns:
 *   - Verification patterns (which verifications the user holds, usage rate).
 *   - Attestation usage (which attestations are presented where).
 *   - Identity claim frequency (how often claims are made per verifier).
 *   - Trust score evolution over time.
 *
 * Predicts:
 *   - Likely verification need (next verification the user should obtain).
 *   - Trust score change (up/down/stable based on recent activity).
 *
 * Recommends:
 *   - Verifications to obtain (ranked by gap + usage value).
 *   - Identity actions (re-attest, refresh, share, revoke).
 *
 * Constitutional role — PRIVACY GUARANTEES:
 *   - This trainer ONLY learns from events where ALL of:
 *       1. ev.consentGranted === true
 *       2. ev.payload.identityConsent === true (explicit identity opt-in)
 *       3. ev.category === "identity" OR ev.type starts with "Identity."
 *     Any event failing any check is REJECTED silently.
 *   - No raw PII is persisted — only verification-type ids, attestations,
 *     aggregate counts, and trust-score deltas.
 *   - Exposes a `purge()` method so the user can wipe ALL learned identity
 *     state on demand.
 *   - Never blocks; never throws.
 * ============================================================================
 */

import "server-only";

import type {
  DomainKnowledge,
  DomainPattern,
  KnowledgeFact,
  PlatformEvent,
  Prediction,
  DomainModel,
} from "../types";
import type { DomainTrainer } from "../domain-learning-engine";

// ── Internal state ───────────────────────────────────────────────────────

interface VerificationStats {
  count: number;
  lastAt: string;
  used: number; // times presented to a verifier
}

interface AttestationStats {
  count: number;
  lastAt: string;
  presentedTo: Map<string, number>;
}

// ── Identity Trainer ─────────────────────────────────────────────────────

export class IdentityTrainer implements DomainTrainer {
  public readonly domain = "identity" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { verification_freq: 0.3, attestation_usage: 0.25, trust_trend: 0.25, recency: 0.2 },
    diversityPenalty: 0.15,
    freshnessBoost: 0.4,
    personalizationWeight: 0.75,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;
  private rejectedForPrivacy = 0;

  private verifications = new Map<string, VerificationStats>();
  private attestations = new Map<string, AttestationStats>();
  private trustScoreHistory: Array<{ ts: string; score: number }> = [];
  private knownVerifiers = new Map<string, number>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { verification_gap: 0.3, usage_value: 0.25, trust_impact: 0.25, recency: 0.2 },
      features: ["verification_type", "attestation_type", "verifier", "trust_score"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { verification_freq: 0.35, trust_trend: 0.35, attestation_usage: 0.3 },
      features: ["verification_type", "attestation_type", "trust_score"],
      updatedAt: now,
    };
  }

  /**
   * Privacy gate: returns true ONLY when the event passes all three checks.
   * 1. consentGranted === true
   * 2. payload.identityConsent === true (explicit identity opt-in)
   * 3. category === "identity" OR type starts with "Identity."
   */
  private passesPrivacyGate(ev: PlatformEvent): boolean {
    if (!ev || !ev.consentGranted) return false;
    const p = ev.payload || {};
    if (p.identityConsent !== true) return false;
    if (ev.category !== "identity" && !(ev.type || "").startsWith("Identity.")) return false;
    return true;
  }

  /** Train on a batch of identity events. Privacy-gated; idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!this.passesPrivacyGate(ev)) {
          this.rejectedForPrivacy += 1;
          continue;
        }
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};

        if (ev.type === "Identity.Verified" || p.verificationType) {
          const vType = String(p.verificationType || "general");
          const vs = this.verifications.get(vType) || { count: 0, lastAt: ev.timestamp, used: 0 };
          vs.count += 1;
          vs.lastAt = ev.timestamp;
          this.verifications.set(vType, vs);
        }
        if (ev.type === "Identity.Attested" || p.attestationType) {
          const aType = String(p.attestationType || "general");
          const verifier = String(p.verifier || "unknown");
          const as = this.attestations.get(aType) || { count: 0, lastAt: ev.timestamp, presentedTo: new Map() };
          as.count += 1;
          as.lastAt = ev.timestamp;
          as.presentedTo.set(verifier, (as.presentedTo.get(verifier) || 0) + 1);
          this.attestations.set(aType, as);
          this.knownVerifiers.set(verifier, (this.knownVerifiers.get(verifier) || 0) + 1);
          // Bump usage on the related verification if any
          if (p.verificationType) {
            const vs = this.verifications.get(String(p.verificationType));
            if (vs) { vs.used += 1; this.verifications.set(String(p.verificationType), vs); }
          }
        }
        if (p.trustScore !== undefined) {
          this.trustScoreHistory.push({ ts: ev.timestamp, score: Number(p.trustScore) });
          if (this.trustScoreHistory.length > 200) this.trustScoreHistory.shift();
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Identity event ${ev.type} on ${ev.timestamp}`,
          domain: "identity",
          value: { verificationType: p.verificationType, attestationType: p.attestationType, verifier: p.verifier, trustScore: p.trustScore, type: ev.type },
          sources: [{ source: "platform_event", sourceUrl: `event:${ev.eventId}`, authorityScore: 90, accessedAt: ev.timestamp }],
          confidence: 0.9,
          trustScore: 90,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
          status: "validated",
        });
      }

      // Patterns: most-used verification + trust trend
      const topVer = Array.from(this.verifications.entries()).sort((a, b) => b[1].count - a[1].count)[0];
      if (topVer) {
        this.patterns.set("top_verification", {
          patternId: "top_verification",
          description: `Most-used verification is ${topVer[0]} (${topVer[1].count} times, ${topVer[1].used} presentations)`,
          trigger: { intent: "verify_identity" },
          action: { prefer_verification: topVer[0] },
          confidence: Math.min(1, topVer[1].count / 5),
          observationCount: topVer[1].count,
          lastObservedAt: now,
        });
      }
      if (this.trustScoreHistory.length >= 2) {
        const first = this.trustScoreHistory[0];
        const last = this.trustScoreHistory[this.trustScoreHistory.length - 1];
        const delta = last.score - first.score;
        const trend = delta > 0 ? "rising" : delta < 0 ? "falling" : "stable";
        this.patterns.set("trust_trend", {
          patternId: "trust_trend",
          description: `Trust score is ${trend} (${first.score} → ${last.score})`,
          trigger: { intent: "evaluate_trust" },
          action: { trend, delta },
          confidence: Math.min(1, this.trustScoreHistory.length / 20),
          observationCount: this.trustScoreHistory.length,
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 15 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current identity knowledge. */
  async getKnowledge(): Promise<DomainKnowledge> {
    return {
      domain: this.domain,
      facts: Array.from(this.facts.values()),
      patterns: Array.from(this.patterns.values()),
      recommendationModel: this.recommendationModel,
      predictionModel: this.predictionModel,
      ranking: this.ranking,
      confidence: this.confidence,
      lastTrainedAt: this.lastTrainedAt,
      freshness: this.freshness,
    };
  }

  /** Predict likely verification need / trust score change for input. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Verifications the user is likely to need (already holds but low usage → refresh)
      const topVers = Array.from(this.verifications.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, limit);
      for (const [vType, vs] of topVers) {
        const daysSince = (Date.now() - new Date(vs.lastAt).getTime()) / (1000 * 60 * 60 * 24);
        const refreshBoost = daysSince > 90 ? 0.2 : 0;
        out.push({
          predictionId: `pred_ver_${vType}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_action",
          predicted: { verification_type: vType, likely_refresh: daysSince > 90, last_used_days_ago: Math.round(daysSince) },
          confidence: Math.min(1, vs.count / 5 + refreshBoost),
          timeHorizon: "next_30_days",
          reasoning: `Used ${vs.count} times; last ${Math.round(daysSince)}d ago.`,
          evidence: [`verification:${vType}`],
          createdAt: now,
        });
      }
      // Trust score change prediction
      if (this.trustScoreHistory.length >= 2) {
        const last = this.trustScoreHistory[this.trustScoreHistory.length - 1];
        const first = this.trustScoreHistory[Math.max(0, this.trustScoreHistory.length - 6)];
        const slope = (last.score - first.score) / Math.max(1, this.trustScoreHistory.length - 1 - Math.max(0, this.trustScoreHistory.length - 6));
        out.push({
          predictionId: `pred_trust_${Date.now().toString(36)}`,
          userId: i.userId,
          type: "next_action",
          predicted: { current_trust: last.score, expected_change: Math.round(slope * 100) / 100, trend: slope > 0 ? "rising" : slope < 0 ? "falling" : "stable" },
          confidence: Math.min(1, this.trustScoreHistory.length / 30),
          timeHorizon: "next_14_days",
          reasoning: `Trust score slope across last ${this.trustScoreHistory.length} samples is ${slope.toFixed(2)}.`,
          evidence: [`trust_history:${this.trustScoreHistory.length}`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend verifications to obtain / identity actions. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "verification";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "verification") {
        // Suggest verifications with high usage but stale (need refresh) — and adjacent common ones
        for (const [vType, vs] of Array.from(this.verifications.entries()).sort((a, b) => b[1].used - a[1].used).slice(0, limit)) {
          const daysSince = (Date.now() - new Date(vs.lastAt).getTime()) / (1000 * 60 * 60 * 24);
          out.push({ kind: "verification", type: vType, score: vs.used, stale: daysSince > 90, reason: `Presented ${vs.used} times` });
        }
      } else if (intent === "attestation") {
        for (const [aType, as] of Array.from(this.attestations.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, limit)) {
          const topVerifier = as.presentedTo.size ? Array.from(as.presentedTo.entries()).sort((x, y) => y[1] - x[1])[0] : null;
          out.push({ kind: "attestation", type: aType, score: as.count, top_verifier: topVerifier ? topVerifier[0] : null, reason: `Attested ${as.count} times` });
        }
      } else if (intent === "action") {
        // Refresh stale verifications; revoke unused ones
        for (const [vType, vs] of Array.from(this.verifications.entries()).slice(0, limit)) {
          const daysSince = (Date.now() - new Date(vs.lastAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince > 90) out.push({ kind: "identity_action", action: "refresh", type: vType, reason: `${Math.round(daysSince)}d since last use` });
          else if (vs.used === 0) out.push({ kind: "identity_action", action: "consider_revoke", type: vType, reason: "Never presented to a verifier" });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  /** PRIVACY: Wipe ALL learned identity state on user demand. */
  async purge(): Promise<void> {
    try {
      this.facts.clear();
      this.patterns.clear();
      this.verifications.clear();
      this.attestations.clear();
      this.knownVerifiers.clear();
      this.trustScoreHistory = [];
      this.confidence = 0;
      this.freshness = 0;
      this.eventsSeen = 0;
      this.rejectedForPrivacy = 0;
      this.lastTrainedAt = new Date(0).toISOString();
    } catch {
      // best-effort
    }
  }

  /** Privacy audit stats — exposed for the AI Safety dashboard. */
  privacyAudit(): { eventsLearned: number; rejectedForPrivacy: number; factsStored: number; patternsStored: number } {
    return {
      eventsLearned: this.eventsSeen,
      rejectedForPrivacy: this.rejectedForPrivacy,
      factsStored: this.facts.size,
      patternsStored: this.patterns.size,
    };
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const identityTrainer = new IdentityTrainer();
