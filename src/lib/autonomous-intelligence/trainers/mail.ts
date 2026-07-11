// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Mail Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's email behavior across Circle Mail.
 *
 * Learns:
 *   - Email patterns (senders, threads, frequency).
 *   - Contact frequency (most-emailed senders / recipients).
 *   - Category preferences (primary / social / promotions / updates).
 *   - Response times (median time-to-reply per sender).
 *   - Open and click rates per sender.
 *
 * Predicts:
 *   - Important emails (priority scoring).
 *   - Response priority (which unread thread needs a reply first).
 *   - Likely category for an incoming email.
 *
 * Recommends:
 *   - Email actions (archive / reply / snooze / mark-important).
 *   - Filters (auto-categorize by sender / subject keyword).
 *   - Smart replies (templates ranked by past acceptance).
 *
 * Constitutional role:
 *   - NEVER learns message content (only metadata: sender, length bucket,
 *     category, subject keywords if explicitly tagged).
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

interface SenderStats {
  sent: number;
  received: number;
  opened: number;
  replied: number;
  lastAt: string;
  replyTimes: number[];
  categories: Map<string, number>;
}

// ── Mail Trainer ─────────────────────────────────────────────────────────

export class MailTrainer implements DomainTrainer {
  public readonly domain = "mail" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { sender_freq: 0.3, open_rate: 0.25, reply_rate: 0.2, recency: 0.25 },
    diversityPenalty: 0.1,
    freshnessBoost: 0.3,
    personalizationWeight: 0.8,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private senders = new Map<string, SenderStats>();
  private categories = new Map<string, number>();
  private lastReceivedAt = new Map<string, number>();
  private smartReplyTemplates = new Map<string, { shown: number; accepted: number }>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { sender_freq: 0.3, open_rate: 0.25, category_match: 0.25, recency: 0.2 },
      features: ["sender", "category", "subject_keyword", "hour_of_day"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { sender_freq: 0.35, reply_rate: 0.3, recency: 0.2, importance: 0.15 },
      features: ["sender", "category", "hour_of_day"],
      updatedAt: now,
    };
  }

  /** Train on a batch of mail events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "mail") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const sender = String(p.sender || p.from || "unknown");
        const category = String(p.category || "primary");
        const opened = ev.type === "Mail.Read" || p.opened === true;
        const replied = ev.type === "Mail.Replied" || p.replied === true;
        const isOutbound = ev.type === "Mail.Sent";
        const ts = new Date(ev.timestamp).getTime();

        const ss = this.senders.get(sender) || { sent: 0, received: 0, opened: 0, replied: 0, lastAt: ev.timestamp, replyTimes: [], categories: new Map() };
        if (isOutbound) ss.sent += 1; else ss.received += 1;
        if (opened) ss.opened += 1;
        if (replied) ss.replied += 1;
        ss.lastAt = ev.timestamp;
        ss.categories.set(category, (ss.categories.get(category) || 0) + 1);
        // Reply-time tracking
        if (isOutbound && this.lastReceivedAt.has(sender)) {
          const gap = ts - (this.lastReceivedAt.get(sender) || 0);
          if (gap > 0 && gap < 1000 * 60 * 60 * 24 * 7) {
            ss.replyTimes.push(gap);
            if (ss.replyTimes.length > 50) ss.replyTimes.shift();
          }
          this.lastReceivedAt.delete(sender);
        }
        if (!isOutbound) this.lastReceivedAt.set(sender, ts);
        this.senders.set(sender, ss);

        this.categories.set(category, (this.categories.get(category) || 0) + 1);

        if (p.smartReplyId) {
          const id = String(p.smartReplyId);
          const tpl = this.smartReplyTemplates.get(id) || { shown: 0, accepted: 0 };
          tpl.shown += 1;
          if (p.smartReplyAccepted === true) tpl.accepted += 1;
          this.smartReplyTemplates.set(id, tpl);
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `${isOutbound ? "Sent" : "Received"} mail to/from ${sender} (${category})`,
          domain: "mail",
          value: { sender, category, opened, replied, isOutbound, type: ev.type },
          sources: [{ source: "platform_event", sourceUrl: `event:${ev.eventId}`, authorityScore: 60, accessedAt: ev.timestamp }],
          confidence: 0.7,
          trustScore: 60,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
          status: "validated",
        });
      }

      // Patterns: top sender + dominant category
      const topSender = Array.from(this.senders.entries()).sort((a, b) => (b[1].received + b[1].sent) - (a[1].received + a[1].sent))[0];
      if (topSender) {
        this.patterns.set("top_sender", {
          patternId: "top_sender",
          description: `Most-frequent mail contact is ${topSender[0]} (${topSender[1].received + topSender[1].sent} messages)`,
          trigger: { intent: "compose_mail" },
          action: { suggest_recipient: topSender[0] },
          confidence: Math.min(1, (topSender[1].received + topSender[1].sent) / 25),
          observationCount: topSender[1].received + topSender[1].sent,
          lastObservedAt: now,
        });
      }
      const topCat = Array.from(this.categories.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        this.patterns.set("dominant_category", {
          patternId: "dominant_category",
          description: `Dominant mail category is ${topCat[0]} (${topCat[1]} messages)`,
          trigger: { intent: "auto_categorize" },
          action: { default_category: topCat[0] },
          confidence: Math.min(1, topCat[1] / 30),
          observationCount: topCat[1],
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 25 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current mail knowledge. */
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

  /** Predict important emails / response priority / category for input. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number; sender?: string; emails?: Array<{ id?: string; sender?: string }> };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Top senders likely to need attention (high received + low reply rate)
      const topSenders = Array.from(this.senders.entries())
        .filter(([, s]) => s.received > 0)
        .sort((a, b) => b[1].received - a[1].received)
        .slice(0, limit);
      for (const [sender, ss] of topSenders) {
        const openRate = ss.received ? ss.opened / ss.received : 0;
        const replyRate = ss.received ? ss.replied / ss.received : 0;
        out.push({
          predictionId: `pred_mail_${sender}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_contact",
          predicted: { sender, importance: Math.round(openRate * 100) / 100, expected_reply_priority: Math.round(replyRate * 100) / 100 },
          confidence: Math.min(1, ss.received / 10),
          timeHorizon: "next_24_hours",
          reasoning: `${ss.received} emails from ${sender}; ${(openRate * 100).toFixed(0)}% opened, ${(replyRate * 100).toFixed(0)}% replied.`,
          evidence: [`sender:${sender}`],
          createdAt: now,
        });
      }
      // Predict category for incoming emails
      const emails = Array.isArray(i.emails) ? i.emails : [];
      for (const email of emails.slice(0, limit)) {
        const sender = String(email.sender || "");
        const ss = this.senders.get(sender);
        const cat = ss && ss.categories.size ? Array.from(ss.categories.entries()).sort((a, b) => b[1] - a[1])[0][0] : "primary";
        out.push({
          predictionId: `pred_cat_${email.id || out.length}_${Date.now().toString(36)}`,
          userId: i.userId,
          type: "next_action",
          predicted: { email_id: email.id, sender, category: cat },
          confidence: ss ? Math.min(1, ss.received / 5) : 0.1,
          timeHorizon: "immediate",
          reasoning: `Sender ${sender} most-often categorized as ${cat}.`,
          evidence: [`sender:${sender}`, `category:${cat}`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend email actions / filters / smart replies. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "action";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "action") {
        for (const [sender, ss] of Array.from(this.senders.entries()).filter(([, s]) => s.received > 0).sort((a, b) => (b[1].replied / b[1].received) - (a[1].replied / a[1].received)).slice(0, limit)) {
          const replyRate = ss.received ? ss.replied / ss.received : 0;
          out.push({ kind: "email_action", sender, action: replyRate > 0.5 ? "reply_promptly" : "archive_or_snooze", score: replyRate, reason: `${ss.received} emails, ${(replyRate * 100).toFixed(0)}% replied` });
        }
      } else if (intent === "filter") {
        for (const [sender, ss] of Array.from(this.senders.entries()).sort((a, b) => b[1].received - a[1].received).slice(0, limit)) {
          const cat = ss.categories.size ? Array.from(ss.categories.entries()).sort((a, b) => b[1] - a[1])[0][0] : "primary";
          out.push({ kind: "filter", sender, category: cat, score: ss.received, reason: `Auto-route to ${cat}` });
        }
      } else if (intent === "smart_reply") {
        for (const [id, tpl] of Array.from(this.smartReplyTemplates.entries()).sort((a, b) => (b[1].accepted / Math.max(1, b[1].shown)) - (a[1].accepted / Math.max(1, a[1].shown))).slice(0, limit)) {
          const rate = tpl.shown ? tpl.accepted / tpl.shown : 0;
          out.push({ kind: "smart_reply", template_id: id, score: rate, samples: tpl.shown, reason: `${(rate * 100).toFixed(0)}% acceptance` });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const mailTrainer = new MailTrainer();
