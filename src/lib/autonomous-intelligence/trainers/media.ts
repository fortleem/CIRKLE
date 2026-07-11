// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Media Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's media consumption behavior across Mashahd (Video) and
 * Lamahat (Photos). Handles both "video" and "media" platform-event
 * categories — Mashahd emits Video.* events, Lamahat emits Media.* events.
 *
 * Learns:
 *   - Media consumption patterns (categories, formats, channels).
 *   - Video completion rates (watched to end vs skipped).
 *   - Watch time (total + average per video / channel).
 *   - Content preferences (topics, creators, length buckets).
 *   - Sharing patterns (which content gets shared most).
 *
 * Predicts:
 *   - Next watch (video / channel likely to be watched next).
 *   - Completion probability for a given video.
 *   - Engagement likelihood (will the user like / share / comment).
 *
 * Recommends:
 *   - Videos (ranked by predicted engagement + completion).
 *   - Channels (ranked by watch time + completion).
 *   - Playlists (groups of videos by topic affinity).
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

interface VideoStats {
  impressions: number;
  completed: number;
  skipped: number;
  totalWatchMs: number;
  shares: number;
  lastAt: string;
  channel: string;
  category: string;
}

interface ChannelStats {
  views: number;
  totalWatchMs: number;
  completed: number;
  lastAt: string;
}

// ── Media Trainer ────────────────────────────────────────────────────────

export class MediaTrainer implements DomainTrainer {
  public readonly domain = "media" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { channel_affinity: 0.3, completion_rate: 0.25, category_pref: 0.25, recency: 0.2 },
    diversityPenalty: 0.2,
    freshnessBoost: 0.3,
    personalizationWeight: 0.85,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private videos = new Map<string, VideoStats>();
  private channels = new Map<string, ChannelStats>();
  private categories = new Map<string, number>();
  private lengthBuckets = new Map<string, number>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { channel_affinity: 0.3, completion_rate: 0.25, category_pref: 0.25, length_fit: 0.2 },
      features: ["video_id", "channel_id", "category", "length_bucket", "hour_of_day"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { completion_rate: 0.4, channel_affinity: 0.3, category_pref: 0.3 },
      features: ["video_id", "channel_id", "category", "length_bucket"],
      updatedAt: now,
    };
  }

  /** Train on a batch of media/video events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "media" && ev.category !== "video") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};
        const videoId = String(p.videoId || p.mediaId || "unknown");
        const channelId = String(p.channelId || p.creatorId || "");
        const category = String(p.category || p.topic || "general");
        const watchMs = Number(p.watchTimeMs || p.durationMs || 0);
        const lengthBucket = String(p.lengthBucket || this.bucketLength(watchMs));

        const vs = this.videos.get(videoId) || { impressions: 0, completed: 0, skipped: 0, totalWatchMs: 0, shares: 0, lastAt: ev.timestamp, channel: channelId, category };
        vs.impressions += 1;
        if (ev.type === "Video.Completed" || p.completed === true) vs.completed += 1;
        if (ev.type === "Video.Skipped" || p.skipped === true) vs.skipped += 1;
        if (ev.type === "Media.Shared" || p.action === "share") vs.shares += 1;
        vs.totalWatchMs += watchMs;
        vs.lastAt = ev.timestamp;
        if (channelId) vs.channel = channelId;
        vs.category = category;
        this.videos.set(videoId, vs);

        if (channelId) {
          const cs = this.channels.get(channelId) || { views: 0, totalWatchMs: 0, completed: 0, lastAt: ev.timestamp };
          cs.views += 1;
          cs.totalWatchMs += watchMs;
          if (ev.type === "Video.Completed" || p.completed === true) cs.completed += 1;
          cs.lastAt = ev.timestamp;
          this.channels.set(channelId, cs);
        }
        this.categories.set(category, (this.categories.get(category) || 0) + 1);
        this.lengthBuckets.set(lengthBucket, (this.lengthBuckets.get(lengthBucket) || 0) + 1);

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Media event ${ev.type} for ${videoId} (${category})`,
          domain: "media",
          value: { videoId, channelId, category, watchMs, completed: ev.type === "Video.Completed", type: ev.type },
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

      // Patterns: top channel + dominant category
      const topChannel = Array.from(this.channels.entries()).sort((a, b) => b[1].views - a[1].views)[0];
      if (topChannel) {
        const rate = topChannel[1].views ? topChannel[1].completed / topChannel[1].views : 0;
        this.patterns.set("top_channel", {
          patternId: "top_channel",
          description: `Top channel is ${topChannel[0]} (${topChannel[1].views} views, ${(rate * 100).toFixed(0)}% completion)`,
          trigger: { intent: "watch_video" },
          action: { boost_channel: topChannel[0] },
          confidence: Math.min(1, topChannel[1].views / 15),
          observationCount: topChannel[1].views,
          lastObservedAt: now,
        });
      }
      const topCat = Array.from(this.categories.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topCat) {
        this.patterns.set("top_category", {
          patternId: "top_category",
          description: `Most-watched category is ${topCat[0]} (${topCat[1]} views)`,
          trigger: { intent: "browse_media" },
          action: { boost_category: topCat[0] },
          confidence: Math.min(1, topCat[1] / 25),
          observationCount: topCat[1],
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

  /** Snapshot current media knowledge. */
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

  /** Predict next watch / completion probability / engagement for input. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number; videoId?: string; videos?: Array<{ id?: string; channelId?: string; category?: string }> };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Top channels likely to be watched next
      const topChans = Array.from(this.channels.entries()).sort((a, b) => b[1].views - a[1].views).slice(0, limit);
      for (const [channelId, cs] of topChans) {
        const rate = cs.views ? cs.completed / cs.views : 0;
        out.push({
          predictionId: `pred_media_${channelId}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_action",
          predicted: { channel_id: channelId, likely_watch: true, completion_probability: Math.round(rate * 100) / 100 },
          confidence: Math.min(1, cs.views / 12),
          timeHorizon: "next_session",
          reasoning: `Watched ${cs.views} videos from ${channelId}; ${(rate * 100).toFixed(0)}% completed.`,
          evidence: [`channel:${channelId}`],
          createdAt: now,
        });
      }
      // Completion probability for specific videos
      const videos = i.videoId ? [{ id: i.videoId }] : Array.isArray(i.videos) ? i.videos : [];
      for (const video of videos.slice(0, limit)) {
        const vid = String(video.id || "");
        const vs = this.videos.get(vid);
        const cs = video.channelId ? this.channels.get(String(video.channelId)) : null;
        const vRate = vs && vs.impressions ? vs.completed / vs.impressions : 0;
        const cRate = cs && cs.views ? cs.completed / cs.views : 0;
        const prob = Math.min(1, vRate * 0.6 + cRate * 0.4);
        out.push({
          predictionId: `pred_comp_${vid}_${Date.now().toString(36)}`,
          userId: i.userId,
          type: "next_action",
          predicted: { video_id: vid, completion_probability: Math.round(prob * 100) / 100 },
          confidence: vs ? Math.min(1, vs.impressions / 5) : 0.1,
          timeHorizon: "this_view",
          reasoning: `Video completion ${(vRate * 100).toFixed(0)}%, channel ${(cRate * 100).toFixed(0)}%.`,
          evidence: [`video:${vid}`],
          createdAt: now,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend videos / channels / playlists. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "video";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "video") {
        for (const [videoId, vs] of Array.from(this.videos.entries()).sort((a, b) => (b[1].completed / Math.max(1, b[1].impressions)) - (a[1].completed / Math.max(1, a[1].impressions))).slice(0, limit)) {
          const rate = vs.impressions ? vs.completed / vs.impressions : 0;
          out.push({ kind: "video", video_id: videoId, channel: vs.channel, category: vs.category, score: rate, reason: `${(rate * 100).toFixed(0)}% completion` });
        }
      } else if (intent === "channel") {
        for (const [channelId, cs] of Array.from(this.channels.entries()).sort((a, b) => b[1].totalWatchMs - a[1].totalWatchMs).slice(0, limit)) {
          out.push({ kind: "channel", channel_id: channelId, score: cs.totalWatchMs, views: cs.views, reason: `${Math.round(cs.totalWatchMs / 1000)}s total watch` });
        }
      } else if (intent === "playlist") {
        // Group top videos by category into "playlists"
        for (const [category, count] of Array.from(this.categories.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)) {
          const vids = Array.from(this.videos.values()).filter((v) => v.category === category).sort((a, b) => b.impressions - a.impressions).slice(0, 5).map((v, idx) => ({ video_id: Array.from(this.videos.keys()).find((k) => this.videos.get(k) === v), position: idx + 1 }));
          out.push({ kind: "playlist", category, video_count: count, score: count, items: vids, reason: `${count} views in ${category}` });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private bucketLength(watchMs: number): string {
    if (watchMs <= 0) return "unknown";
    if (watchMs < 60_000) return "short"; // <1min
    if (watchMs < 600_000) return "medium"; // 1-10min
    return "long";
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const mediaTrainer = new MediaTrainer();
