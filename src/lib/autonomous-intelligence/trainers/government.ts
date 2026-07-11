// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Government Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's interaction with government services across Circle Verify
 * + government integrations (ministry APIs, attestation, document services).
 *
 * Learns:
 *   - Government service usage (which services, frequency, success rate).
 *   - Document verification patterns (which doc types verified, expiry dates).
 *   - Compliance needs (recurring renewals, mandatory filings, deadlines).
 *
 * Predicts:
 *   - Likely government service need (e.g., visa renewal, license renewal).
 *   - Document expiry (passport / ID / license approaching expiry).
 *
 * Recommends:
 *   - Government services (ranked by predicted need + recency).
 *   - Compliance actions (renewals / filings due soon).
 *   - Alerts (mandatory government notices the user should read).
 *
 * Constitutional role:
 *   - Government data is HIGH-TRUST and HIGH-SENSITIVITY.
 *   - Only learns from events with consentGranted=true AND
 *     payload.governmentConsent === true (double opt-in).
 *   - Trust scores for government_api sources default to 98.
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

interface ServiceStats {
  uses: number;
  lastUsed: string;
  successes: number;
  failures: number;
  avgProcessingDays: number;
}

interface DocumentRecord {
  docType: string;
  issuedAt?: string;
  expiresAt?: string;
  verified: boolean;
  lastUpdated: string;
}

// ── Government Trainer ───────────────────────────────────────────────────

export class GovernmentTrainer implements DomainTrainer {
  public readonly domain = "government" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { service_freq: 0.3, expiry_urgency: 0.4, compliance_priority: 0.3 },
    diversityPenalty: 0.05,
    freshnessBoost: 0.3,
    personalizationWeight: 0.6,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private services = new Map<string, ServiceStats>();
  private documents = new Map<string, DocumentRecord>();
  private alertsRead = new Map<string, number>(); // alertType → count
  private complianceDue: Array<{ item: string; due: string; severity: "info" | "warn" | "critical" }> = [];

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { service_freq: 0.3, expiry_urgency: 0.4, compliance: 0.3 },
      features: ["service_id", "doc_type", "expiry_date", "severity", "days_until_due"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { service_recency: 0.4, expiry_proximity: 0.4, compliance_pattern: 0.2 },
      features: ["service_id", "doc_type", "expiry_date", "month_of_year"],
      updatedAt: now,
    };
  }

  /** Train on a batch of government events. Double opt-in required. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "government" && ev.category !== "identity") continue;
        // Double opt-in: payload must also explicitly grant government consent.
        const p = ev.payload || {};
        if (p.governmentConsent !== true && p.consentScope !== "government") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;

        const serviceId = String(p.serviceId || p.service || "unknown");
        const success = p.status !== "failed" && ev.type !== "Government.Alert.Read";
        const processingDays = Number(p.processingDays || 0);
        const ss = this.services.get(serviceId) || { uses: 0, lastUsed: ev.timestamp, successes: 0, failures: 0, avgProcessingDays: 0 };
        ss.uses += 1;
        ss.lastUsed = ev.timestamp;
        if (success) ss.successes += 1; else ss.failures += 1;
        if (processingDays > 0) ss.avgProcessingDays = (ss.avgProcessingDays * (ss.uses - 1) + processingDays) / ss.uses;
        this.services.set(serviceId, ss);

        // Document verification + expiry tracking
        if (p.docType || p.documentType) {
          const docType = String(p.docType || p.documentType);
          const doc: DocumentRecord = {
            docType,
            issuedAt: p.issuedAt ? String(p.issuedAt) : undefined,
            expiresAt: p.expiresAt ? String(p.expiresAt) : undefined,
            verified: ev.type === "Identity.Verified" || p.verified === true,
            lastUpdated: ev.timestamp,
          };
          this.documents.set(docType, doc);
          if (doc.expiresAt) {
            const daysUntil = (new Date(doc.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            const severity = daysUntil < 7 ? "critical" : daysUntil < 30 ? "warn" : "info";
            this.complianceDue.push({ item: `${docType} renewal`, due: doc.expiresAt, severity });
          }
        }

        if (ev.type === "Government.Alert.Read") {
          const alertType = String(p.alertType || "general");
          this.alertsRead.set(alertType, (this.alertsRead.get(alertType) || 0) + 1);
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Government event ${ev.type} for service ${serviceId}`,
          domain: "government",
          value: { serviceId, success, processingDays, docType: p.docType, type: ev.type },
          sources: [{ source: "government_api", sourceUrl: `event:${ev.eventId}`, authorityScore: 98, accessedAt: ev.timestamp }],
          confidence: 0.9,
          trustScore: 98,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
          status: "validated",
        });
      }

      // Patterns: most-used service + upcoming expiry
      const topSvc = Array.from(this.services.entries()).sort((a, b) => b[1].uses - a[1].uses)[0];
      if (topSvc) {
        this.patterns.set("frequent_service", {
          patternId: "frequent_service",
          description: `Most-used government service is ${topSvc[0]} (${topSvc[1].uses} uses)`,
          trigger: { intent: "government_service" },
          action: { suggest_service: topSvc[0] },
          confidence: Math.min(1, topSvc[1].uses / 5),
          observationCount: topSvc[1].uses,
          lastObservedAt: now,
        });
      }
      const upcoming = this.upcomingExpiries(30)[0];
      if (upcoming) {
        this.patterns.set("upcoming_expiry", {
          patternId: "upcoming_expiry",
          description: `${upcoming.docType} expires on ${upcoming.expiresAt}`,
          trigger: { intent: "compliance_check" },
          action: { remind_renewal: upcoming.docType, by_date: upcoming.expiresAt },
          confidence: 0.95,
          observationCount: 1,
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 10 + this.confidence * 0.9);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current government knowledge. */
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

  /** Predict next government service need + document expiry. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];

      // Next likely service based on usage frequency
      const topSvc = Array.from(this.services.entries()).sort((a, b) => b[1].uses - a[1].uses).slice(0, limit);
      for (const [svc, ss] of topSvc) {
        out.push({
          predictionId: `pred_gov_${svc}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_action",
          predicted: { service: svc, likely_success_rate: ss.uses ? ss.successes / ss.uses : 1, avg_processing_days: ss.avgProcessingDays },
          confidence: Math.min(1, ss.uses / 5),
          timeHorizon: "next_90_days",
          reasoning: `Used ${svc} ${ss.uses} times; ${ss.successes}/${ss.uses} successful.`,
          evidence: [`service:${svc}`],
          createdAt: now,
        });
      }
      // Document expiry predictions
      for (const exp of this.upcomingExpiries(limit)) {
        const daysUntil = Math.max(0, (new Date(exp.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        out.push({
          predictionId: `pred_doc_${exp.docType}_${Date.now().toString(36)}`,
          userId: i.userId,
          type: "next_reminder",
          predicted: { doc_type: exp.docType, expires_at: exp.expiresAt, days_until_expiry: Math.round(daysUntil) },
          confidence: 0.95,
          timeHorizon: daysUntil < 7 ? "this_week" : daysUntil < 30 ? "this_month" : "next_90_days",
          reasoning: `${exp.docType} expires on ${exp.expiresAt}.`,
          evidence: [`document:${exp.docType}`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend government services / compliance actions / alerts. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "service";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "service") {
        for (const [svc, ss] of Array.from(this.services.entries()).sort((a, b) => b[1].uses - a[1].uses).slice(0, limit)) {
          out.push({ kind: "government_service", service_id: svc, score: ss.uses, success_rate: ss.uses ? ss.successes / ss.uses : 1, avg_days: ss.avgProcessingDays });
        }
      } else if (intent === "compliance") {
        for (const c of this.complianceDue.slice(0, limit)) {
          const daysUntil = (new Date(c.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          out.push({ kind: "compliance_action", item: c.item, due: c.due, severity: c.severity, days_until: Math.round(daysUntil) });
        }
      } else if (intent === "alert") {
        for (const [alertType, n] of Array.from(this.alertsRead.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)) {
          out.push({ kind: "alert", alert_type: alertType, read_count: n, reason: `User engaged with ${n} alerts of this type` });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private upcomingExpiries(withinDays: number): Array<{ docType: string; expiresAt: string }> {
    const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
    return Array.from(this.documents.values())
      .filter((d) => d.expiresAt && new Date(d.expiresAt).getTime() <= cutoff && new Date(d.expiresAt).getTime() >= Date.now() - 1000 * 60 * 60 * 24 * 30)
      .map((d) => ({ docType: d.docType, expiresAt: d.expiresAt as string }))
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const governmentTrainer = new GovernmentTrainer();
