// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Messaging Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's messaging behavior across Wasl (Circle Chat).
 *
 * Learns:
 *   - Contact frequency (most-messaged contacts, response reciprocity).
 *   - Response time patterns (median time-to-reply per contact).
 *   - Language preferences (Arabic vs English vs mixed).
 *   - Smart-reply acceptance rate (which suggestions get accepted/rejected).
 *
 * Predicts:
 *   - next_contact — who the user will message next.
 *   - Likely response time for a given contact.
 *   - Conversation topic (work / family / social / commerce).
 *
 * Recommends:
 *   - Smart replies (ranked by past acceptance + topic match).
 *   - Contacts to reach out to (ranked by recency decay + reciprocity).
 *   - Conversation priorities (unread threads that need a reply).
 *
 * Constitutional role:
 *   - NEVER learns message content (only metadata: contact id, length bucket,
 *     language tag, topic tag if explicitly provided).
 *   - Only learns from events with consentGranted=true.
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

interface ContactStats {
  sent: number;
  received: number;
  medianReplyMs: number;
  lastInteraction: string;
  languages: Map<string, number>;
  topics: Map<string, number>;
  replyTimes: number[]; // rolling buffer (last 50)
}

// ── Messaging Trainer ────────────────────────────────────────────────────

export class MessagingTrainer implements DomainTrainer {
  public readonly domain = "messaging" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { contact_freq: 0.35, reciprocity: 0.2, recency: 0.25, language_match: 0.2 },
    diversityPenalty: 0.1,
    freshnessBoost: 0.2,
    personalizationWeight: 0.8,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private contacts = new Map<string, ContactStats>();
  private smartReplyAccepted = new Map<string, number>();
  private smartReplyShown = new Map<string, number>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { acceptance_rate: 0.4, topic_match: 0.3, language_match: 0.2, length_fit: 0.1 },
      features: ["contact_id", "topic", "language", "length_bucket", "hour_of_day"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { recency: 0.4, frequency: 0.4, reciprocity: 0.2 },
      features: ["contact_id", "hour_of_day", "day_of_week", "topic"],
      updatedAt: now,
    };
  }

  /** Train on a batch of messaging events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      // Track last received timestamp per contact to compute reply times.
      const lastReceivedAt = new Map<string, number>();
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "messaging") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const contact = String(p.contactId || p.peer || "unknown");
        const lang = String(p.language || "ar");
        const topic = String(p.topic || "general");
        const isOutbound = ev.type === "Message.Sent";

        const cs = this.contacts.get(contact) || {
          sent: 0, received: 0, medianReplyMs: 0, lastInteraction: ev.timestamp,
          languages: new Map(), topics: new Map(), replyTimes: [],
        };
        if (isOutbound) cs.sent += 1; else cs.received += 1;
        cs.lastInteraction = ev.timestamp;
        cs.languages.set(lang, (cs.languages.get(lang) || 0) + 1);
        cs.topics.set(topic, (cs.topics.get(topic) || 0) + 1);
        const ts = new Date(ev.timestamp).getTime();
        if (isOutbound && lastReceivedAt.has(contact)) {
          const gap = ts - (lastReceivedAt.get(contact) || 0);
          if (gap > 0 && gap < 1000 * 60 * 60 * 24 * 3) {
            cs.replyTimes.push(gap);
            if (cs.replyTimes.length > 50) cs.replyTimes.shift();
            cs.medianReplyMs = this.median(cs.replyTimes);
          }
          lastReceivedAt.delete(contact);
        }
        if (!isOutbound) lastReceivedAt.set(contact, ts);
        this.contacts.set(contact, cs);

        // Smart-reply telemetry
        if (p.smartReplyId) {
          const id = String(p.smartReplyId);
          this.smartReplyShown.set(id, (this.smartReplyShown.get(id) || 0) + 1);
          if (p.smartReplyAccepted === true) this.smartReplyAccepted.set(id, (this.smartReplyAccepted.get(id) || 0) + 1);
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `${isOutbound ? "Sent message to" : "Received message from"} ${contact} on ${ev.timestamp}`,
          domain: "messaging",
          value: { contact, lang, topic, isOutbound, type: ev.type },
          sources: [{ source: "platform_event", sourceUrl: `event:${ev.eventId}`, authorityScore: 60, accessedAt: ev.timestamp }],
          confidence: 0.7,
          trustScore: 60,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
          status: "validated",
        });
      }

      // Patterns: top contact + dominant language
      const top = this.topContacts(1)[0];
      if (top) {
        this.patterns.set("top_contact", {
          patternId: "top_contact",
          description: `Most-messaged contact is ${top.contact} (${top.sent + top.received} interactions)`,
          trigger: { intent: "compose_message" },
          action: { suggest_contact: top.contact, suggest_topic: top.topTopic },
          confidence: Math.min(1, (top.sent + top.received) / 30),
          observationCount: top.sent + top.received,
          lastObservedAt: now,
        });
      }
      const topLang = Array.from(this.contacts.values()).flatMap((c) => Array.from(c.languages.entries())).reduce((acc, [lang, n]) => { acc.set(lang, (acc.get(lang) || 0) + n); return acc; }, new Map<string, number>());
      const dominantLang = Array.from(topLang.entries()).sort((a, b) => b[1] - a[1])[0];
      if (dominantLang) {
        this.patterns.set("dominant_language", {
          patternId: "dominant_language",
          description: `Dominant messaging language is ${dominantLang[0]} (${dominantLang[1]} messages)`,
          trigger: { intent: "compose_message" },
          action: { default_language: dominantLang[0] },
          confidence: Math.min(1, dominantLang[1] / 50),
          observationCount: dominantLang[1],
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 30 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current messaging knowledge. */
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

  /** Predict next contacts / reply times / topics for input. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { limit?: number; userId?: string };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const tops = this.topContacts(limit);
      const out: Prediction[] = [];
      for (const t of tops) {
        out.push({
          predictionId: `pred_msg_${t.contact}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_contact",
          predicted: { contact: t.contact, topic: t.topTopic, language: t.topLang, expected_reply_ms: t.medianReply },
          confidence: Math.min(1, (t.sent + t.received) / 40),
          timeHorizon: "next_24_hours",
          reasoning: `Interacted ${t.sent + t.received} times; median reply ${Math.round(t.medianReply / 1000)}s.`,
          evidence: [`contact:${t.contact}`, `pattern:top_contact`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend smart replies / contacts / priorities. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; topic?: string; language?: string; limit?: number };
      const intent = i.intent || "contact";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "contact") {
        for (const t of this.topContacts(limit)) {
          const daysSince = (Date.now() - new Date(t.lastInteraction).getTime()) / (1000 * 60 * 60 * 24);
          const score = (t.sent + t.received) * 0.5 + Math.max(0, 1 - daysSince / 30) * 0.5;
          out.push({ kind: "contact", contact: t.contact, score, reason: `Last interaction ${Math.round(daysSince)}d ago, ${t.sent + t.received} total` });
        }
      } else if (intent === "smart_reply") {
        // Rank smart-reply templates by historical acceptance rate
        const ranked = Array.from(this.smartReplyShown.entries()).map(([id, shown]) => ({
          id, shown, accepted: this.smartReplyAccepted.get(id) || 0, rate: shown ? (this.smartReplyAccepted.get(id) || 0) / shown : 0,
        })).sort((a, b) => b.rate - a.rate).slice(0, limit);
        for (const r of ranked) out.push({ kind: "smart_reply", template_id: r.id, score: r.rate, samples: r.shown });
      } else if (intent === "priority") {
        // Contacts with received > sent (waiting on reply)
        for (const [contact, cs] of this.contacts.entries()) {
          if (cs.received > cs.sent) {
            out.push({ kind: "priority", contact, unread_delta: cs.received - cs.sent, last: cs.lastInteraction });
            if (out.length >= limit) break;
          }
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private topContacts(limit: number): Array<{ contact: string; sent: number; received: number; medianReply: number; topTopic: string; topLang: string; lastInteraction: string }> {
    return Array.from(this.contacts.entries()).map(([contact, cs]) => {
      const topTopic = cs.topics.size ? Array.from(cs.topics.entries()).sort((a, b) => b[1] - a[1])[0][0] : "general";
      const topLang = cs.languages.size ? Array.from(cs.languages.entries()).sort((a, b) => b[1] - a[1])[0][0] : "ar";
      return { contact, sent: cs.sent, received: cs.received, medianReply: cs.medianReplyMs, topTopic, topLang, lastInteraction: cs.lastInteraction };
    }).sort((a, b) => (b.sent + b.received) - (a.sent + a.received)).slice(0, limit);
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const messagingTrainer = new MessagingTrainer();
