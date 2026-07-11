// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Feed Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's feed (Midan / Square) consumption behavior.
 *
 * Learns:
 *   - Content preferences (categories, tags, formats: text/image/video).
 *   - Engagement patterns (like / comment / share rates per category).
 *   - Posting frequency (user's own posts, time-of-day patterns).
 *   - Trending topics the user engages with.
 *
 * Predicts:
 *   - next_engagement — whether the user will engage with a given post.
 *   - Likely interest score for an unseen piece of content.
 *   - Content-type preference (text / image / video) for the next session.
 *
 * Recommends:
 *   - Posts (ranked by predicted engagement).
 *   - Creators to follow (based on co-engagement with liked creators).
 *   - Topics to explore (underrepresented but adjacent to interests).
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

interface CategoryStats {
  impressions: number;
  engagements: number; // likes + comments + shares
  shares: number;
  lastEngaged: string;
}

interface CreatorStats {
  engagements: number;
  lastEngaged: string;
}

// ── Feed Trainer ─────────────────────────────────────────────────────────

export class FeedTrainer implements DomainTrainer {
  public readonly domain = "feed" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { category_pref: 0.4, creator_pref: 0.25, recency: 0.2, format_pref: 0.15 },
    diversityPenalty: 0.2,
    freshnessBoost: 0.25,
    personalizationWeight: 0.85,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private categories = new Map<string, CategoryStats>();
  private creators = new Map<string, CreatorStats>();
  private formats = new Map<string, number>(); // text / image / video → impressions
  private postsCreated = 0;
  private trendingTopics = new Map<string, number>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { category_pref: 0.35, creator_pref: 0.25, format_pref: 0.2, recency: 0.2 },
      features: ["post_id", "category", "creator_id", "format", "topic", "age_hours"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { engagement_rate: 0.5, recency: 0.25, creator_affinity: 0.25 },
      features: ["category", "creator_id", "format", "hour_of_day"],
      updatedAt: now,
    };
  }

  /** Train on a batch of feed events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "feed") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const category = String(p.category || p.topic || "general");
        const creator = String(p.creatorId || p.authorId || "");
        const format = String(p.format || p.mediaType || "text");
        const engaged = ev.type !== "Post.Viewed" && ev.type !== "Post.Impression";
        const shared = ev.type === "Post.Shared" || p.action === "share";

        const cs = this.categories.get(category) || { impressions: 0, engagements: 0, shares: 0, lastEngaged: ev.timestamp };
        cs.impressions += 1;
        if (engaged) cs.engagements += 1;
        if (shared) cs.shares += 1;
        cs.lastEngaged = ev.timestamp;
        this.categories.set(category, cs);

        if (creator) {
          const cr = this.creators.get(creator) || { engagements: 0, lastEngaged: ev.timestamp };
          if (engaged) cr.engagements += 1;
          cr.lastEngaged = ev.timestamp;
          this.creators.set(creator, cr);
        }
        this.formats.set(format, (this.formats.get(format) || 0) + 1);

        if (ev.type === "Post.Created") this.postsCreated += 1;

        const tags = Array.isArray(p.tags) ? (p.tags as string[]).slice(0, 8) : [];
        for (const t of tags) this.trendingTopics.set(t, (this.trendingTopics.get(t) || 0) + 1);

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Feed event ${ev.type} on category ${category} (${format})`,
          domain: "feed",
          value: { category, creator, format, engaged, shared, type: ev.type, tags },
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

      // Patterns: top category + dominant format
      const topCat = this.topCategories(1)[0];
      if (topCat) {
        const rate = topCat.impressions ? topCat.engagements / topCat.impressions : 0;
        this.patterns.set("top_category", {
          patternId: "top_category",
          description: `Top category is ${topCat.category} (${topCat.impressions} impressions, ${(rate * 100).toFixed(0)}% engagement)`,
          trigger: { intent: "feed_browse", category: topCat.category },
          action: { boost_category: topCat.category },
          confidence: Math.min(1, topCat.impressions / 30),
          observationCount: topCat.impressions,
          lastObservedAt: now,
        });
      }
      const topFmt = Array.from(this.formats.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topFmt) {
        this.patterns.set("preferred_format", {
          patternId: "preferred_format",
          description: `Preferred content format is ${topFmt[0]} (${topFmt[1]} impressions)`,
          trigger: { intent: "feed_browse" },
          action: { default_format: topFmt[0] },
          confidence: Math.min(1, topFmt[1] / 40),
          observationCount: topFmt[1],
          lastObservedAt: now,
        });
      }

      this.confidence = Math.min(1, processed / 40 + this.confidence * 0.85);
      this.freshness = 1;
      this.lastTrainedAt = now;
      this.recommendationModel.updatedAt = now;
      this.predictionModel.updatedAt = now;
    } catch {
      // best-effort
    }
  }

  /** Snapshot current feed knowledge. */
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

  /** Predict engagement for input { posts?: [{category, creatorId, format}] }. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { posts?: Array<{ id?: string; category?: string; creatorId?: string; format?: string }>; userId?: string; limit?: number };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const posts = Array.isArray(i.posts) ? i.posts : [];
      const out: Prediction[] = [];
      for (const post of posts.slice(0, limit)) {
        const cat = String(post.category || "general");
        const creator = String(post.creatorId || "");
        const format = String(post.format || "text");
        const cs = this.categories.get(cat);
        const cr = this.creators.get(creator);
        const rate = cs && cs.impressions ? cs.engagements / cs.impressions : 0;
        const creatorBoost = cr ? Math.min(0.3, cr.engagements / 20) : 0;
        const formatMatch = (this.topFormat() === format) ? 0.1 : 0;
        const score = Math.min(1, rate * 0.7 + creatorBoost + formatMatch);
        out.push({
          predictionId: `pred_feed_${post.id || out.length}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_engagement",
          predicted: { post_id: post.id, category: cat, creator_id: creator, format, engagement_probability: Math.round(score * 100) / 100 },
          confidence: Math.min(1, (cs?.impressions || 0) / 20),
          timeHorizon: "this_session",
          reasoning: `Category ${cat} has ${(rate * 100).toFixed(0)}% engagement rate; creator affinity +${creatorBoost.toFixed(2)}.`,
          evidence: [`category:${cat}`, `creator:${creator}`],
          createdAt: now,
        });
      }
      // Content-type preference for next session
      out.push({
        predictionId: `pred_fmt_${Date.now().toString(36)}`,
        userId: i.userId,
        type: "next_action",
        predicted: { preferred_format: this.topFormat() || "text", posting_rate_per_week: Math.round(this.postsCreated / Math.max(1, this.eventsSeen / 50)) },
        confidence: Math.min(1, this.eventsSeen / 60),
        timeHorizon: "next_session",
        reasoning: `Based on ${this.formats.size} observed formats and ${this.postsCreated} posts created.`,
        evidence: [`formats:${Array.from(this.formats.keys()).join(",")}`],
        createdAt: now,
      });
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend posts / creators to follow / topics to explore. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "post";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "post") {
        for (const c of this.topCategories(limit)) {
          out.push({ kind: "post_suggestion", category: c.category, score: c.engagements / Math.max(1, c.impressions), reason: `${c.engagements}/${c.impressions} engagements` });
        }
      } else if (intent === "creator") {
        for (const [creator, cr] of Array.from(this.creators.entries()).sort((a, b) => b[1].engagements - a[1].engagements).slice(0, limit)) {
          out.push({ kind: "creator_to_follow", creator_id: creator, score: cr.engagements, reason: `Engaged ${cr.engagements} times` });
        }
      } else if (intent === "topic") {
        for (const [topic, count] of Array.from(this.trendingTopics.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)) {
          out.push({ kind: "topic_to_explore", topic, score: count, reason: `Trending ${count} times in your feed` });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private topCategories(limit: number): Array<{ category: string; impressions: number; engagements: number; shares: number }> {
    return Array.from(this.categories.entries()).map(([category, cs]) => ({ category, impressions: cs.impressions, engagements: cs.engagements, shares: cs.shares }))
      .sort((a, b) => b.engagements - a.engagements).slice(0, limit);
  }

  private topFormat(): string | undefined {
    const top = Array.from(this.formats.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : undefined;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const feedTrainer = new FeedTrainer();
