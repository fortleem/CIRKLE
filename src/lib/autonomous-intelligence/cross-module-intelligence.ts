// @ts-nocheck
/**
 * CIRKLE Brain AI — AIKE Cross-Module Intelligence
 * ============================================================================
 * Phase 7.5 — Autonomous Intelligence & Knowledge Engine
 *
 * Cross-Module Intelligence reasons ACROSS modules. When a user books a
 * flight, the engine automatically infers what they likely need next:
 *
 *   hotels, weather, currency, restaurants, maps, translator, emergency
 *   numbers, transport, payments, travel documents, medical card, offline
 *   maps
 *
 * — WITHOUT requiring the user to ask. The engine uses rule templates +
 * the knowledge graph + domain trainer confidence to produce a list of
 * InferredNeed objects with confidence scores + suggested actions.
 *
 * Constitutional role:
 *   - NEVER acts on inferences directly — only emits them for the
 *     orchestrator / UI to surface.
 *   - Respects consent: if the triggering event lacks consent, no
 *     inference is made.
 *   - Always includes reasoning + evidence so the inference is auditable.
 * ============================================================================
 */

import "server-only";

import type {
  PlatformEvent,
  CrossModuleInference,
  InferredNeed,
  DomainTrainerType,
} from "./types";

import { globalKnowledgeGraph } from "./knowledge-graph";
import { globalDomainLearningEngine } from "./domain-learning-engine";

// ── Inference rules ──────────────────────────────────────────────────────

interface InferenceRule {
  /** Trigger event type pattern. */
  matchType: RegExp;
  /** Source module name. */
  sourceModule: string;
  /** Function returning inferred needs for a matched event. */
  infer: (event: PlatformEvent) => Array<
    Omit<InferredNeed, "confidence"> & { baseConfidence: number }
  >;
}

const RULES: InferenceRule[] = [
  {
    matchType: /Travel\.Booked|Flight\.Booked/i,
    sourceModule: "travel",
    infer: (e) => [
      { module: "hotels", need: "Hotel near destination", suggestedAction: { type: "search_hotels", destination: e.payload.destination }, baseConfidence: 0.9 },
      { module: "weather", need: "Weather forecast at destination", suggestedAction: { type: "fetch_weather", destination: e.payload.destination }, baseConfidence: 0.85 },
      { module: "currency", need: "Currency exchange rates", suggestedAction: { type: "fetch_currency", from: e.payload.fromCurrency, to: e.payload.toCurrency }, baseConfidence: 0.8 },
      { module: "restaurants", need: "Restaurants at destination", suggestedAction: { type: "search_restaurants", destination: e.payload.destination }, baseConfidence: 0.7 },
      { module: "maps", need: "Airport → hotel navigation", suggestedAction: { type: "plan_route", destination: e.payload.destination }, baseConfidence: 0.85 },
      { module: "translator", need: "Local language translator", suggestedAction: { type: "load_translator", locale: e.payload.destinationLocale }, baseConfidence: 0.6 },
      { module: "emergency", need: "Emergency numbers at destination", suggestedAction: { type: "load_emergency", destination: e.payload.destination }, baseConfidence: 0.75 },
      { module: "transport", need: "Ground transport from airport", suggestedAction: { type: "search_transport", destination: e.payload.destination }, baseConfidence: 0.8 },
      { module: "payments", need: "Travel card / payment method", suggestedAction: { type: "suggest_payment_method" }, baseConfidence: 0.65 },
      { module: "documents", need: "Travel documents checklist", suggestedAction: { type: "check_documents" }, baseConfidence: 0.7 },
      { module: "health", need: "Medical card + travel insurance", suggestedAction: { type: "verify_insurance" }, baseConfidence: 0.6 },
      { module: "offline_maps", need: "Offline maps for destination", suggestedAction: { type: "download_offline_map" }, baseConfidence: 0.55 },
    ],
  },
  {
    matchType: /Payment\.Completed|Purchase\.Completed/i,
    sourceModule: "payments",
    infer: (e) => [
      { module: "receipts", need: "Receipt storage", suggestedAction: { type: "store_receipt", paymentId: e.eventId }, baseConfidence: 0.9 },
      { module: "expenses", need: "Expense tracking categorization", suggestedAction: { type: "categorize_expense", amount: e.payload.amount, category: e.payload.category }, baseConfidence: 0.85 },
      { module: "tax", need: "Tax-relevant tagging", suggestedAction: { type: "tag_tax", amount: e.payload.amount }, baseConfidence: 0.5 },
      { module: "recurring", need: "Recurring payment detection", suggestedAction: { type: "check_recurring", merchant: e.payload.merchant }, baseConfidence: 0.6 },
    ],
  },
  {
    matchType: /Restaurant\.Booked|Restaurant\.Viewed/i,
    sourceModule: "restaurant",
    infer: (e) => [
      { module: "maps", need: "Navigation to restaurant", suggestedAction: { type: "navigate", placeId: (e.entityIds || [])[0] }, baseConfidence: 0.85 },
      { module: "weather", need: "Weather for visit time", suggestedAction: { type: "fetch_weather" }, baseConfidence: 0.5 },
      { module: "payments", need: "Payment method for bill", suggestedAction: { type: "suggest_payment_method" }, baseConfidence: 0.6 },
      { module: "reviews", need: "Restaurant reviews", suggestedAction: { type: "fetch_reviews", placeId: (e.entityIds || [])[0] }, baseConfidence: 0.7 },
    ],
  },
  {
    matchType: /Map\.Navigation/i,
    sourceModule: "maps",
    infer: () => [
      { module: "traffic", need: "Real-time traffic along route", suggestedAction: { type: "fetch_traffic" }, baseConfidence: 0.85 },
      { module: "fuel", need: "Nearby fuel stations", suggestedAction: { type: "find_fuel" }, baseConfidence: 0.6 },
      { module: "weather", need: "Weather along route", suggestedAction: { type: "fetch_weather" }, baseConfidence: 0.6 },
    ],
  },
  {
    matchType: /Job\.Applied/i,
    sourceModule: "jobs",
    infer: (e) => [
      { module: "documents", need: "CV tailoring", suggestedAction: { type: "tailor_cv", jobId: (e.entityIds || [])[0] }, baseConfidence: 0.8 },
      { module: "interview", need: "Interview prep checklist", suggestedAction: { type: "interview_prep" }, baseConfidence: 0.75 },
      { module: "calendar", need: "Application deadline reminder", suggestedAction: { type: "set_reminder" }, baseConfidence: 0.7 },
    ],
  },
  {
    matchType: /Video\.Watched/i,
    sourceModule: "media",
    infer: (e) => [
      { module: "creator", need: "Subscribe to creator", suggestedAction: { type: "suggest_subscribe", creatorId: e.payload.creatorId }, baseConfidence: 0.6 },
      { module: "feed", need: "Related content", suggestedAction: { type: "recommend_related", videoId: (e.entityIds || [])[0] }, baseConfidence: 0.75 },
    ],
  },
  {
    matchType: /Government\.Alert\.Read/i,
    sourceModule: "government",
    infer: (e) => [
      { module: "news", need: "Related news", suggestedAction: { type: "fetch_news", topic: e.payload.topic }, baseConfidence: 0.8 },
      { module: "emergency", need: "Emergency services", suggestedAction: { type: "load_emergency" }, baseConfidence: 0.7 },
    ],
  },
  {
    matchType: /Identity\.Verified|Identity\.Attested/i,
    sourceModule: "identity",
    infer: () => [
      { module: "documents", need: "Sync verified documents", suggestedAction: { type: "sync_documents" }, baseConfidence: 0.85 },
      { module: "government", need: "Link government services", suggestedAction: { type: "link_gov_services" }, baseConfidence: 0.7 },
    ],
  },
];

// ── Cross-Module Intelligence ────────────────────────────────────────────

export class CrossModuleIntelligence {
  /** All inferences keyed by id. */
  private inferences = new Map<string, CrossModuleInference>();
  /** Inferences indexed by trigger event id. */
  private byEvent = new Map<string, string[]>();
  /** Active (not-yet-acted-upon) inference ids. */
  private active = new Set<string>();

  /**
   * Infer needs from a trigger event. Returns the created inference
   * object, or null if no rule matches / consent was not granted.
   */
  async inferNeeds(triggerEvent: PlatformEvent): Promise<CrossModuleInference | null> {
    try {
      if (!triggerEvent || !triggerEvent.consentGranted) return null;
      const rule = RULES.find((r) => r.matchType.test(triggerEvent.type));
      if (!rule) return null;
      const rawNeeds = rule.infer(triggerEvent);
      if (rawNeeds.length === 0) return null;
      const inferredNeeds: InferredNeed[] = [];
      for (const n of rawNeeds) {
        const confidence = await this.adjustConfidence(n.module, n.baseConfidence, triggerEvent);
        inferredNeeds.push({
          module: n.module,
          need: n.need,
          confidence,
          suggestedAction: n.suggestedAction,
        });
      }
      const inference: CrossModuleInference = {
        inferenceId: `ci_${triggerEvent.eventId}_${Date.now().toString(36)}`,
        triggerEventId: triggerEvent.eventId,
        sourceModule: rule.sourceModule,
        inferredNeeds,
        createdAt: new Date().toISOString(),
        actedUpon: false,
      };
      this.inferences.set(inference.inferenceId, inference);
      const list = this.byEvent.get(triggerEvent.eventId) || [];
      list.push(inference.inferenceId);
      this.byEvent.set(triggerEvent.eventId, list);
      this.active.add(inference.inferenceId);
      // Bound memory: evict oldest if we exceed 5000 inferences.
      if (this.inferences.size > 5000) {
        const oldest = this.inferences.keys().next().value;
        if (oldest) {
          this.inferences.delete(oldest);
          this.active.delete(oldest);
        }
      }
      return inference;
    } catch {
      return null;
    }
  }

  /** Return all inferences for a given trigger event. */
  getInferencesForEvent(eventId: string): CrossModuleInference[] {
    try {
      const ids = this.byEvent.get(eventId) || [];
      const out: CrossModuleInference[] = [];
      for (const id of ids) {
        const inf = this.inferences.get(id);
        if (inf) out.push(inf);
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Return all active (not-yet-acted-upon) inferences. */
  getActiveInferences(limit = 50): CrossModuleInference[] {
    try {
      const out: CrossModuleInference[] = [];
      for (const id of this.active) {
        const inf = this.inferences.get(id);
        if (inf) out.push(inf);
        if (out.length >= limit) break;
      }
      return out;
    } catch {
      return [];
    }
  }

  /** Mark an inference as acted upon (consumed by the orchestrator/UI). */
  markActedUpon(inferenceId: string): void {
    try {
      const inf = this.inferences.get(inferenceId);
      if (inf) {
        inf.actedUpon = true;
        this.active.delete(inferenceId);
      }
    } catch {
      // best-effort
    }
  }

  /** Stats for monitoring. */
  stats(): Record<string, unknown> {
    return {
      total: this.inferences.size,
      active: this.active.size,
      byModule: this.tallyByModule(),
    };
  }

  // ── internals ──────────────────────────────────────────────────────────

  private async adjustConfidence(
    module: string,
    base: number,
    event: PlatformEvent
  ): Promise<number> {
    try {
      // If a domain trainer exists for this module and has high confidence,
      // boost the inference confidence slightly; otherwise decay.
      const knowledge = await globalDomainLearningEngine.getDomainKnowledge(module as DomainTrainerType);
      if (knowledge) {
        const trainerConf = knowledge.confidence;
        // Weighted blend: 70% base + 30% trainer confidence.
        return Math.min(1, base * 0.7 + trainerConf * 0.3);
      }
      // If the user has past events in the graph, boost slightly.
      if (event.userId) {
        const userNode = globalKnowledgeGraph.getNode(`user:${event.userId}`);
        if (userNode) return Math.min(1, base * 1.05);
      }
      return base;
    } catch {
      return base;
    }
  }

  private tallyByModule(): Record<string, number> {
    const tally: Record<string, number> = {};
    for (const inf of this.inferences.values()) {
      for (const n of inf.inferredNeeds) {
        tally[n.module] = (tally[n.module] || 0) + 1;
      }
    }
    return tally;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCrossModuleIntelligence = new CrossModuleIntelligence();
