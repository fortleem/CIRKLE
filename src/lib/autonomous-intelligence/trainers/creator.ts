// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Creator Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's content-creation behavior across Creator Channels.
 *
 * Learns:
 *   - Content creation patterns (type, length, topic, format).
 *   - Audience engagement (views, likes, comments, shares per content type).
 *   - Best posting times (hour-of-day / day-of-week performance).
 *   - Content-type performance (video / image / article / short).
 *   - Monetization patterns (subscriptions, tips, ads revenue).
 *
 * Predicts:
 *   - Next content performance (expected engagement for a planned post).
 *   - Audience growth trajectory.
 *   - Expected revenue per content type.
 *
 * Recommends:
 *   - Content ideas (topics and formats with best historical performance).
 *   - Posting schedules (best day/hour by past engagement).
 *   - Monetization strategies (subscription vs tips vs ads).
 *
 * Constitutional role:
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

interface ContentTypeStats {
  published: number;
  totalViews: number;
  totalEngagement: number;
  totalRevenue: number;
  lastAt: string;
}

interface HourPerformance {
  posts: number;
  engagement: number;
}

// ── Creator Trainer ──────────────────────────────────────────────────────

export class CreatorTrainer implements DomainTrainer {
  public readonly domain = "creator" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { content_type_perf: 0.3, posting_time: 0.25, monetization: 0.2, recency: 0.25 },
    diversityPenalty: 0.2,
    freshnessBoost: 0.3,
    personalizationWeight: 0.85,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private contentTypes = new Map<string, ContentTypeStats>();
  private hourlyPerf = new Map<number, HourPerformance>();
  private monetization = new Map<string, { revenue: number; count: number }>();
  private topics = new Map<string, number>();
  private audienceHistory: Array<{ ts: string; subscribers: number }> = [];

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { content_type_perf: 0.3, hour_of_day: 0.25, topic_match: 0.25, monetization: 0.2 },
      features: ["content_type", "topic", "hour_of_day", "day_of_week", "format"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { engagement_rate: 0.45, posting_time: 0.3, audience_growth: 0.25 },
      features: ["content_type", "topic", "hour_of_day"],
      updatedAt: now,
    };
  }

  /** Train on a batch of creator events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "creator") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const type = String(p.contentType || p.type || "post");
        const views = Number(p.views || 0);
        const engagement = Number(p.likes || 0) + Number(p.comments || 0) + Number(p.shares || 0);
        const revenue = Number(p.revenue || p.tipAmount || 0);
        const hour = new Date(ev.timestamp).getUTCHours();

        const ct = this.contentTypes.get(type) || { published: 0, totalViews: 0, totalEngagement: 0, totalRevenue: 0, lastAt: ev.timestamp };
        if (ev.type === "Creator.Published") ct.published += 1;
        ct.totalViews += views;
        ct.totalEngagement += engagement;
        ct.totalRevenue += revenue;
        ct.lastAt = ev.timestamp;
        this.contentTypes.set(type, ct);

        const hp = this.hourlyPerf.get(hour) || { posts: 0, engagement: 0 };
        hp.posts += 1;
        hp.engagement += engagement;
        this.hourlyPerf.set(hour, hp);

        if (revenue > 0) {
          const channel = String(p.monetizationChannel || p.channel || "tips");
          const mc = this.monetization.get(channel) || { revenue: 0, count: 0 };
          mc.revenue += revenue;
          mc.count += 1;
          this.monetization.set(channel, mc);
        }

        const topic = String(p.topic || p.category || "");
        if (topic) this.topics.set(topic, (this.topics.get(topic) || 0) + 1);

        if (ev.type === "Creator.Subscribed" || p.subscribers !== undefined) {
          this.audienceHistory.push({ ts: ev.timestamp, subscribers: Number(p.subscribers || 0) });
          if (this.audienceHistory.length > 100) this.audienceHistory.shift();
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Creator event ${ev.type} for ${type} (${views} views, ${engagement} engagement)`,
          domain: "creator",
          value: { type, views, engagement, revenue, hour, topic, eventType: ev.type },
          sources: [{ source: "platform_event", sourceUrl: `event:${ev.eventId}`, authorityScore: 65, accessedAt: ev.timestamp }],
          confidence: 0.75,
          trustScore: 65,
          verificationCount: 1,
          contradictions: [],
          lastCheckedAt: now,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
          status: "validated",
        });
      }

      // Patterns: best content type + best posting hour
      const topType = Array.from(this.contentTypes.entries()).sort((a, b) => (b[1].totalEngagement / Math.max(1, b[1].published)) - (a[1].totalEngagement / Math.max(1, a[1].published)))[0];
      if (topType) {
        const rate = topType[1].published ? topType[1].totalEngagement / topType[1].published : 0;
        this.patterns.set("top_content_type", {
          patternId: "top_content_type",
          description: `Best-performing content type is ${topType[0]} (${topType[1].published} posts, avg ${Math.round(rate)} engagement)`,
          trigger: { intent: "create_content" },
          action: { suggest_type: topType[0] },
          confidence: Math.min(1, topType[1].published / 10),
          observationCount: topType[1].published,
          lastObservedAt: now,
        });
      }
      const bestHour = Array.from(this.hourlyPerf.entries()).sort((a, b) => (b[1].engagement / Math.max(1, b[1].posts)) - (a[1].engagement / Math.max(1, a[1].posts)))[0];
      if (bestHour) {
        const rate = bestHour[1].posts ? bestHour[1].engagement / bestHour[1].posts : 0;
        this.patterns.set("best_posting_hour", {
          patternId: "best_posting_hour",
          description: `Best posting hour is ${bestHour[0]}:00 UTC (avg ${Math.round(rate)} engagement)`,
          trigger: { intent: "schedule_post" },
          action: { suggest_hour: bestHour[0] },
          confidence: Math.min(1, bestHour[1].posts / 8),
          observationCount: bestHour[1].posts,
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 20 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current creator knowledge. */
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

  /** Predict content performance / audience growth / revenue for input. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number; contentType?: string };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Predict performance per content type
      const types = Array.from(this.contentTypes.entries()).sort((a, b) => (b[1].totalEngagement / Math.max(1, b[1].published)) - (a[1].totalEngagement / Math.max(1, a[1].published))).slice(0, limit);
      for (const [type, ct] of types) {
        const engRate = ct.published ? ct.totalEngagement / ct.published : 0;
        const revPerPost = ct.published ? ct.totalRevenue / ct.published : 0;
        out.push({
          predictionId: `pred_creator_${type}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_action",
          predicted: { content_type: type, expected_engagement: Math.round(engRate), expected_revenue: Math.round(revPerPost * 100) / 100 },
          confidence: Math.min(1, ct.published / 8),
          timeHorizon: "next_publication",
          reasoning: `${type} averaged ${Math.round(engRate)} engagement across ${ct.published} posts.`,
          evidence: [`content_type:${type}`],
          createdAt: now,
        });
      }
      // Audience growth trajectory
      if (this.audienceHistory.length >= 2) {
        const first = this.audienceHistory[0];
        const last = this.audienceHistory[this.audienceHistory.length - 1];
        const growth = last.subscribers - first.subscribers;
        out.push({
          predictionId: `pred_aud_${Date.now().toString(36)}`,
          userId: i.userId,
          type: "next_action",
          predicted: { current_subscribers: last.subscribers, growth_delta: growth, trend: growth >= 0 ? "up" : "down" },
          confidence: Math.min(1, this.audienceHistory.length / 20),
          timeHorizon: "next_30_days",
          reasoning: `Audience moved from ${first.subscribers} to ${last.subscribers} subscribers.`,
          evidence: [`audience_history:${this.audienceHistory.length}`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend content ideas / posting schedules / monetization strategies. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "idea";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "idea") {
        for (const [topic, count] of Array.from(this.topics.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)) {
          out.push({ kind: "content_idea", topic, score: count, reason: `Topic posted ${count} times` });
        }
      } else if (intent === "schedule") {
        for (const [hour, hp] of Array.from(this.hourlyPerf.entries()).sort((a, b) => (b[1].engagement / Math.max(1, b[1].posts)) - (a[1].engagement / Math.max(1, a[1].posts))).slice(0, limit)) {
          out.push({ kind: "posting_schedule", hour, score: hp.posts ? hp.engagement / hp.posts : 0, reason: `${hp.posts} posts at ${hour}:00 UTC` });
        }
      } else if (intent === "monetization") {
        for (const [channel, mc] of Array.from(this.monetization.entries()).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, limit)) {
          out.push({ kind: "monetization_strategy", channel, revenue: mc.revenue, avg_per_post: mc.count ? mc.revenue / mc.count : 0, reason: `${mc.count} monetized posts` });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const creatorTrainer = new CreatorTrainer();
