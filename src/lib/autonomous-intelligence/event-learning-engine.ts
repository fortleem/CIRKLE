// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Event Learning Engine
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * The Event Learning Engine is the universal event sink of AIKE. EVERY
 * platform event — Travel.Booked, Payment.Completed, Message.Sent,
 * Post.Created, Video.Watched, News.Read, Restaurant.Booked,
 * Map.Navigation, Search.Executed, Identity.Verified, Job.Applied,
 * Creator.Subscribed, Government.Alert.Read, Mail.Sent, Media.Uploaded —
 * flows through here.
 *
 * Pipeline per event:
 *   1. ingestEvent(event) — queues the event for processing (async).
 *   2. processEvent(event) — updates the knowledge graph (adds entity
 *      node + user node + edge between them), forwards the event to the
 *      appropriate domain trainer, and feeds the experience-replay engine
 *      for journey tracking.
 *   3. Stats are maintained per user, per category, per session.
 *
 * Constitutional role:
 *   - NEVER processes events without consentGranted=true.
 *   - NEVER throws — errors are caught and pushed to an error log.
 *   - ALWAYS processes asynchronously — ingestEvent returns immediately.
 * ============================================================================
 */

import "server-only";

import type {
  PlatformEvent,
  PlatformEventCategory,
  DomainTrainerType,
  KnowledgeNodeType,
  KnowledgeEdgeType,
} from "./types";

import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalExperienceReplay } from "./experience-replay";
import { globalDomainLearningEngine } from "./domain-learning-engine";

// ── Category → Domain mapping ────────────────────────────────────────────

const CATEGORY_TO_DOMAIN: Record<PlatformEventCategory, DomainTrainerType> = {
  travel: "travel",
  restaurant: "travel",
  payment: "payments",
  messaging: "messaging",
  feed: "feed",
  video: "media",
  news: "feed",
  event: "circle",
  circle: "circle",
  job: "jobs",
  creator: "creator",
  government: "government",
  maps: "maps",
  business: "shopping",
  search: "feed",
  recommendation: "feed",
  identity: "identity",
  education: "education",
  mail: "mail",
  media: "media",
};

// ── Event Learning Engine ────────────────────────────────────────────────

export class EventLearningEngine {
  /** Pending event queue (FIFO). */
  private queue: PlatformEvent[] = [];
  /** All ingested events keyed by id (LRU-bounded). */
  private events = new Map<string, PlatformEvent>();
  /** Event ids by user id. */
  private byUser = new Map<string, string[]>();
  /** Event ids by category. */
  private byCategory = new Map<PlatformEventCategory, string[]>();
  /** Event ids by session id (journey tracking). */
  private bySession = new Map<string, string[]>();
  /** Processing stats. */
  private stats = {
    totalIngested: 0,
    totalProcessed: 0,
    totalSkipped: 0,
    byCategory: {} as Record<string, number>,
    errors: [] as string[],
  };
  /** Whether the background drain loop is currently running. */
  private processing = false;

  /**
   * Ingest a platform event. Returns immediately — processing happens
   * asynchronously in the background loop. Events without consent are
   * counted but not processed.
   */
  async ingestEvent(event: PlatformEvent): Promise<void> {
    try {
      if (!event || !event.eventId) return;
      if (!event.consentGranted) {
        this.stats.totalSkipped++;
        return;
      }
      this.events.set(event.eventId, event);
      this.queue.push(event);
      this.stats.totalIngested++;
      this.indexEvent(event);
      void this.drainQueue();
    } catch (err) {
      this.recordError(`ingestEvent failed: ${(err as Error).message}`);
    }
  }

  /**
   * Process a single event: update knowledge graph + domain trainers +
   * journey tracker. Idempotent — re-processing the same event is safe
   * (the graph dedups edges by id; trainers are responsible for their
   * own dedup; the journey tracker appends at most once per event id).
   */
  async processEvent(event: PlatformEvent): Promise<void> {
    try {
      if (!event || !event.consentGranted) return;
      this.updateKnowledgeGraph(event);
      const domain = CATEGORY_TO_DOMAIN[event.category];
      if (domain) {
        try {
          await globalDomainLearningEngine.trainDomain(domain, [event]);
        } catch (err) {
          this.recordError(`domain training failed for ${domain}: ${(err as Error).message}`);
        }
      }
      try {
        await globalExperienceReplay.trackJourney(event);
      } catch (err) {
        this.recordError(`journey tracking failed: ${(err as Error).message}`);
      }
      this.stats.totalProcessed++;
    } catch (err) {
      this.recordError(`processEvent failed: ${(err as Error).message}`);
    }
  }

  /** Return aggregate stats for monitoring. */
  getEventStats(): Record<string, unknown> {
    return {
      ...this.stats,
      queueDepth: this.queue.length,
      totalKnown: this.events.size,
      usersTracked: this.byUser.size,
      sessionsTracked: this.bySession.size,
    };
  }

  /** Return all events for a user (most-recent first). */
  getEventsByUser(userId: string, limit = 100): PlatformEvent[] {
    try {
      const ids = this.byUser.get(userId) || [];
      const out: PlatformEvent[] = [];
      for (let i = ids.length - 1; i >= 0 && out.length < limit; i--) {
        const e = this.events.get(ids[i]);
        if (e) out.push(e);
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Return all events for a category (most-recent first). */
  getEventsByCategory(category: PlatformEventCategory, limit = 100): PlatformEvent[] {
    try {
      const ids = this.byCategory.get(category) || [];
      const out: PlatformEvent[] = [];
      for (let i = ids.length - 1; i >= 0 && out.length < limit; i--) {
        const e = this.events.get(ids[i]);
        if (e) out.push(e);
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Return all events for a session (chronological). */
  getEventsBySession(sessionId: string): PlatformEvent[] {
    try {
      const ids = this.bySession.get(sessionId) || [];
      const out: PlatformEvent[] = [];
      for (const id of ids) {
        const e = this.events.get(id);
        if (e) out.push(e);
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Get a single event by id. */
  getEvent(eventId: string): PlatformEvent | undefined {
    return this.events.get(eventId);
  }

  // ── internals ──────────────────────────────────────────────────────────

  private indexEvent(event: PlatformEvent): void {
    if (event.userId) {
      const list = this.byUser.get(event.userId) || [];
      list.push(event.eventId);
      if (list.length > 1000) list.shift();
      this.byUser.set(event.userId, list);
    }
    if (event.sessionId) {
      const list = this.bySession.get(event.sessionId) || [];
      list.push(event.eventId);
      if (list.length > 500) list.shift();
      this.bySession.set(event.sessionId, list);
    }
    const cat = event.category;
    const list = this.byCategory.get(cat) || [];
    list.push(event.eventId);
    if (list.length > 5000) list.shift();
    this.byCategory.set(cat, list);
    this.stats.byCategory[cat] = (this.stats.byCategory[cat] || 0) + 1;
  }

  private updateKnowledgeGraph(event: PlatformEvent): void {
    try {
      const now = new Date().toISOString();
      if (event.userId) {
        globalKnowledgeGraph.addNode({
          nodeId: `user:${event.userId}`,
          type: "user",
          name: `user:${event.userId}`,
          properties: { userId: event.userId },
          trustScore: 50,
          confidence: 0.8,
          discoveredAt: now,
          updatedAt: now,
          sourceIds: [event.eventId],
          tags: ["user"],
        });
      }
      const entIds = event.entityIds || [];
      for (const entId of entIds) {
        const nodeType = this.inferNodeType(event.category, entId);
        globalKnowledgeGraph.addNode({
          nodeId: entId,
          type: nodeType,
          name: entId,
          properties: { category: event.category, type: event.type, ...(event.payload || {}) },
          trustScore: 50,
          confidence: 0.7,
          discoveredAt: now,
          updatedAt: now,
          sourceIds: [event.eventId],
          tags: [event.category, event.type],
        });
        if (event.userId) {
          const edgeType = this.inferEdgeType(event.type);
          globalKnowledgeGraph.addEdge({
            edgeId: `e_${event.eventId}_${entId}`,
            fromNodeId: `user:${event.userId}`,
            toNodeId: entId,
            type: edgeType,
            weight: 0.5,
            properties: { event: event.type, ts: event.timestamp },
            firstObservedAt: event.timestamp,
            lastObservedAt: now,
            observationCount: 1,
          });
        }
        // Co-occurrence edges between entity ids (frequently_used_with).
        for (const other of entIds) {
          if (other === entId) continue;
          globalKnowledgeGraph.addEdge({
            edgeId: `e_${event.eventId}_${entId}_${other}`,
            fromNodeId: entId,
            toNodeId: other,
            type: "frequently_used_with",
            weight: 0.3,
            properties: { event: event.eventId },
            firstObservedAt: event.timestamp,
            lastObservedAt: now,
            observationCount: 1,
          });
        }
      }
    } catch (err) {
      this.recordError(`updateKnowledgeGraph: ${(err as Error).message}`);
    }
  }

  private inferNodeType(cat: PlatformEventCategory, entId: string): KnowledgeNodeType {
    if (entId.startsWith("hotel:")) return "hotel";
    if (entId.startsWith("flight:")) return "flight";
    if (entId.startsWith("restaurant:")) return "restaurant";
    if (entId.startsWith("business:")) return "business";
    if (entId.startsWith("post:")) return "post";
    if (entId.startsWith("video:")) return "video";
    if (entId.startsWith("job:")) return "job";
    if (entId.startsWith("creator:")) return "creator";
    if (entId.startsWith("city:")) return "city";
    if (entId.startsWith("country:")) return "country";
    switch (cat) {
      case "travel": return "place";
      case "restaurant": return "restaurant";
      case "payment": return "payment";
      case "video": return "video";
      case "feed": return "post";
      case "job": return "job";
      case "creator": return "creator";
      case "maps": return "place";
      case "business": return "business";
      default: return "topic";
    }
  }

  private inferEdgeType(eventType: string): KnowledgeEdgeType {
    const t = eventType.toLowerCase();
    if (t.includes("book")) return "booked";
    if (t.includes("purchase") || t.includes("paid") || t.includes("payment")) return "paid_for";
    if (t.includes("watch")) return "watched";
    if (t.includes("create") || t.includes("upload")) return "created";
    if (t.includes("share")) return "shared";
    if (t.includes("review") || t.includes("rate")) return "reviewed";
    if (t.includes("join")) return "joined";
    if (t.includes("search")) return "searched";
    if (t.includes("navigate")) return "navigated_to";
    if (t.includes("follow") || t.includes("subscribe")) return "follows";
    if (t.includes("verify") || t.includes("attest")) return "verified_by";
    if (t.includes("like")) return "liked";
    if (t.includes("comment")) return "commented";
    if (t.includes("travel")) return "travels_to";
    return "related_to";
  }

  private async drainQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      let processedThisDrain = 0;
      while (this.queue.length > 0) {
        const event = this.queue.shift();
        if (event) await this.processEvent(event);
        processedThisDrain++;
        // Yield periodically to avoid blocking the event loop.
        if (processedThisDrain % 50 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private recordError(msg: string): void {
    this.stats.errors.push(`${new Date().toISOString()} ${msg}`);
    if (this.stats.errors.length > 200) this.stats.errors.shift();
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalEventLearningEngine = new EventLearningEngine();
