// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Circle (Groups) Domain Trainer
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Learns the user's behavior across The Circle (Groups) module — group
 * engagement, event participation, member activity, and wiki contributions.
 *
 * Learns:
 *   - Group engagement patterns (which circles the user is active in).
 *   - Event participation (RSVP rate, attended vs no-show).
 *   - Member activity (posting, commenting in groups).
 *   - Wiki contributions (edits, creations per topic).
 *
 * Predicts:
 *   - Likely next circle to join.
 *   - Event attendance probability.
 *   - Activity level trajectory.
 *
 * Recommends:
 *   - Circles to join (ranked by topic affinity + activity).
 *   - Events to attend (ranked by past attendance + topic match).
 *   - Connections to make (active members in shared circles).
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

interface CircleStats {
  joined: boolean;
  posts: number;
  comments: number;
  eventsAttended: number;
  lastActive: string;
  topic: string;
}

interface EventStats {
  rsvpYes: number;
  attended: number;
  noShow: number;
  lastAt: string;
}

// ── Circle Trainer ───────────────────────────────────────────────────────

export class CircleTrainer implements DomainTrainer {
  public readonly domain = "circle" as const;

  private facts = new Map<string, KnowledgeFact>();
  private patterns = new Map<string, DomainPattern>();
  private recommendationModel: DomainModel;
  private predictionModel: DomainModel;
  private ranking = {
    factors: { topic_match: 0.3, activity_level: 0.25, event_history: 0.25, recency: 0.2 },
    diversityPenalty: 0.2,
    freshnessBoost: 0.3,
    personalizationWeight: 0.8,
  };
  private confidence = 0;
  private freshness = 0;
  private lastTrainedAt = new Date(0).toISOString();
  private eventsSeen = 0;

  private circles = new Map<string, CircleStats>();
  private events = new Map<string, EventStats>();
  private wikiEdits = new Map<string, number>();
  private topics = new Map<string, number>();
  private memberConnections = new Map<string, number>();

  constructor() {
    const now = new Date().toISOString();
    this.recommendationModel = {
      type: "weighted_features",
      weights: { topic_match: 0.3, activity_level: 0.25, event_history: 0.25, recency: 0.2 },
      features: ["circle_id", "topic", "event_id", "member_id"],
      updatedAt: now,
    };
    this.predictionModel = {
      type: "weighted_features",
      weights: { join_likelihood: 0.4, attendance_rate: 0.35, activity_trend: 0.25 },
      features: ["circle_id", "topic", "event_id", "hour_of_day"],
      updatedAt: now,
    };
  }

  /** Train on a batch of circle/event events. Idempotent. */
  async train(events: PlatformEvent[]): Promise<void> {
    try {
      const now = new Date().toISOString();
      let processed = 0;
      for (const ev of events) {
        if (!ev || !ev.consentGranted) continue;
        if (ev.category !== "circle" && ev.category !== "event") continue;
        if (this.facts.has(`ev_${ev.eventId}`)) continue;
        this.eventsSeen++;
        processed++;
        const p = ev.payload || {};

        if (ev.category === "circle") {
          const circleId = String(p.circleId || p.groupId || "unknown");
          const topic = String(p.topic || p.category || "general");
          const cs = this.circles.get(circleId) || { joined: false, posts: 0, comments: 0, eventsAttended: 0, lastActive: ev.timestamp, topic };
          if (ev.type === "Circle.Created" || ev.type === "Circle.Joined") cs.joined = true;
          if (ev.type === "Circle.PostCreated" || ev.type === "Post.Created") cs.posts += 1;
          if (ev.type === "Circle.Comment") cs.comments += 1;
          cs.lastActive = ev.timestamp;
          cs.topic = topic;
          this.circles.set(circleId, cs);
          this.topics.set(topic, (this.topics.get(topic) || 0) + 1);
          if (p.memberId) this.memberConnections.set(String(p.memberId), (this.memberConnections.get(String(p.memberId)) || 0) + 1);
          if (p.wikiTopic) this.wikiEdits.set(String(p.wikiTopic), (this.wikiEdits.get(String(p.wikiTopic)) || 0) + 1);
        }

        if (ev.category === "event") {
          const eventId = String(p.eventId || "unknown");
          const es = this.events.get(eventId) || { rsvpYes: 0, attended: 0, noShow: 0, lastAt: ev.timestamp };
          if (ev.type === "Event.Joined" || p.rsvp === "yes") es.rsvpYes += 1;
          if (p.attended === true) es.attended += 1;
          if (p.attended === false || p.status === "no_show") es.noShow += 1;
          es.lastAt = ev.timestamp;
          this.events.set(eventId, es);
        }

        this.facts.set(`ev_${ev.eventId}`, {
          factId: `ev_${ev.eventId}`,
          statement: `Circle/event ${ev.type} on ${ev.timestamp}`,
          domain: "circle",
          value: { category: ev.category, type: ev.type, payload: p },
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

      // Patterns: top circle + top topic
      const topCircle = Array.from(this.circles.entries()).sort((a, b) => (b[1].posts + b[1].comments) - (a[1].posts + a[1].comments))[0];
      if (topCircle) {
        const activity = topCircle[1].posts + topCircle[1].comments;
        this.patterns.set("top_circle", {
          patternId: "top_circle",
          description: `Most-active circle is ${topCircle[0]} (${activity} interactions, topic: ${topCircle[1].topic})`,
          trigger: { intent: "browse_circles" },
          action: { boost_circle: topCircle[0] },
          confidence: Math.min(1, activity / 15),
          observationCount: activity,
          lastObservedAt: now,
        });
      }
      const topTopic = Array.from(this.topics.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topTopic) {
        this.patterns.set("top_topic", {
          patternId: "top_topic",
          description: `Top circle topic is ${topTopic[0]} (${topTopic[1]} circles)`,
          trigger: { intent: "join_circle" },
          action: { suggest_topic: topTopic[0] },
          confidence: Math.min(1, topTopic[1] / 8),
          observationCount: topTopic[1],
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

  /** Snapshot current circle knowledge. */
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

  /** Predict next circle to join / event attendance / activity level. */
  async predict(input: unknown): Promise<Prediction[]> {
    try {
      const i = (input || {}) as { userId?: string; limit?: number; eventId?: string };
      const limit = i.limit ?? 5;
      const now = new Date().toISOString();
      const out: Prediction[] = [];
      // Top circles likely to engage with
      const topCircles = Array.from(this.circles.entries()).sort((a, b) => (b[1].posts + b[1].comments) - (a[1].posts + a[1].comments)).slice(0, limit);
      for (const [circleId, cs] of topCircles) {
        out.push({
          predictionId: `pred_circle_${circleId}_${Date.now().toString(36)}_${out.length}`,
          userId: i.userId,
          type: "next_event",
          predicted: { circle_id: circleId, topic: cs.topic, joined: cs.joined, activity_score: cs.posts + cs.comments },
          confidence: Math.min(1, (cs.posts + cs.comments) / 12),
          timeHorizon: "next_7_days",
          reasoning: `Active in ${circleId} ${cs.posts + cs.comments} times; topic ${cs.topic}.`,
          evidence: [`circle:${circleId}`],
          createdAt: now,
        });
      }
      // Event attendance probability
      if (i.eventId) {
        const es = this.events.get(i.eventId);
        if (es) {
          const attRate = es.rsvpYes ? es.attended / es.rsvpYes : 0;
          out.push({
            predictionId: `pred_ev_${i.eventId}_${Date.now().toString(36)}`,
            userId: i.userId,
            type: "next_event",
            predicted: { event_id: i.eventId, attendance_probability: Math.round(attRate * 100) / 100, rsvps: es.rsvpYes },
            confidence: Math.min(1, es.rsvpYes / 5),
            timeHorizon: "this_event",
            reasoning: `${es.attended}/${es.rsvpYes} past RSVPs attended.`,
            evidence: [`event:${i.eventId}`],
            createdAt: now,
          });
        }
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Recommend circles / events / connections. */
  async recommend(input: unknown): Promise<unknown[]> {
    try {
      const i = (input || {}) as { intent?: string; limit?: number };
      const intent = i.intent || "circle";
      const limit = i.limit ?? 5;
      const out: unknown[] = [];
      if (intent === "circle") {
        for (const [circleId, cs] of Array.from(this.circles.entries()).filter(([, s]) => !s.joined).sort((a, b) => (b[1].posts + b[1].comments) - (a[1].posts + a[1].comments)).slice(0, limit)) {
          out.push({ kind: "circle", circle_id: circleId, topic: cs.topic, score: cs.posts + cs.comments, reason: `${cs.posts + cs.comments} interactions` });
        }
      } else if (intent === "event") {
        for (const [eventId, es] of Array.from(this.events.entries()).sort((a, b) => b[1].attended - a[1].attended).slice(0, limit)) {
          const rate = es.rsvpYes ? es.attended / es.rsvpYes : 0;
          out.push({ kind: "event", event_id: eventId, score: rate, attended: es.attended, reason: `${es.attended}/${es.rsvpYes} attended` });
        }
      } else if (intent === "connection") {
        for (const [memberId, count] of Array.from(this.memberConnections.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit)) {
          out.push({ kind: "connection", member_id: memberId, score: count, reason: `Seen ${count} times in shared circles` });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const circleTrainer = new CircleTrainer();
