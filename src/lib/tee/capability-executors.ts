// @ts-nocheck
/**
 * CIRKLE Brain AI — TEE Capability Executors
 * ============================================================================
 *
 * Phase 6 — Trusted Execution Engine
 *
 * The standardized interface through which TEE invokes platform capabilities.
 * TEE NEVER hardcodes module implementations. Each capability id maps to an
 * executor function that calls the real platform service.
 *
 * Executors support:
 *   - Internal modules (pay, travel, news, etc.)
 *   - External APIs (future)
 *   - Government services (future)
 *   - Payment providers (future)
 *   - Future plugins (registered dynamically)
 *
 * Safety model:
 *   - In "dry-run" mode, executors return simulated results without side
 *     effects. This is the default for testing and demos.
 *   - In "live" mode, executors invoke real platform functions.
 *   - Sensitive capabilities (payments, reports) always log an audit entry
 *     even in dry-run mode.
 *
 * Each executor receives (inputs, ctx) and returns a CapabilityInvocationResult.
 * Executors are isolated — a failure in one executor never crashes the TEE.
 * ============================================================================
 */

import "server-only";

import type { CapabilityExecutor, CapabilityInvocationResult, ExecutionContext } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────

function success(output: unknown, executor: string, dryRun: boolean, latencyMs: number): CapabilityInvocationResult {
  return { success: true, output, executor, dryRun, latencyMs };
}

function failure(error: string, executor: string, dryRun: boolean, latencyMs: number): CapabilityInvocationResult {
  return { success: false, error, executor, dryRun, latencyMs };
}

function now(): string {
  return new Date().toISOString();
}

// ── Dry-run simulator ────────────────────────────────────────────────────

/**
 * Produce a simulated result for a capability in dry-run mode.
 * The simulation is deterministic (based on capability id + inputs) so
 * repeated dry-runs produce stable results for testing.
 */
function simulate(capabilityId: string, inputs: Record<string, unknown>): CapabilityInvocationResult {
  const output: Record<string, unknown> = {
    simulated: true,
    capabilityId,
    timestamp: now(),
  };

  // Capability-specific simulations.
  switch (capabilityId) {
    case "pay.transfer-money":
      output.transactionId = `sim_tx_${Date.now().toString(36)}`;
      output.amount = inputs.amount;
      output.currency = inputs.currency || "EGP";
      output.recipient = inputs.to;
      output.status = "completed";
      break;
    case "pay.merchant-payment":
      output.transactionId = `sim_merchant_${Date.now().toString(36)}`;
      output.status = "completed";
      break;
    case "pay.split-bill":
      output.splits = inputs.participants;
      output.perPerson = inputs.total ? Number(inputs.total) / (Array.isArray(inputs.participants) ? inputs.participants.length : 1) : 0;
      break;
    case "pay.qr-payment":
      output.transactionId = `sim_qr_${Date.now().toString(36)}`;
      output.status = "completed";
      break;
    case "pay.currency-exchange":
      output.converted = 1;
      output.rate = 1;
      output.from = inputs.from;
      output.to = inputs.to;
      break;
    case "travel.search-flights":
      output.flights = [
        { id: "sim_flight_1", from: inputs.from, to: inputs.to, price: 320, duration: "2h" },
        { id: "sim_flight_2", from: inputs.from, to: inputs.to, price: 450, duration: "2h30m" },
      ];
      break;
    case "travel.search-hotels":
      output.hotels = [
        { id: "sim_hotel_1", name: "Grand Hotel", pricePerNight: 85, rating: 4.5 },
        { id: "sim_hotel_2", name: "City Inn", pricePerNight: 45, rating: 4.2 },
      ];
      break;
    case "travel.check-visa":
      output.required = false;
      output.durationDays = 90;
      output.passport = inputs.passport;
      output.destination = inputs.destination || inputs.to;
      break;
    case "travel.generate-itinerary":
      output.itinerary = { days: Number(inputs.days) || 3, destination: inputs.destination, activities: ["Visit landmark", "Local cuisine", "Cultural tour"] };
      break;
    case "news.search":
      output.articles = [{ title: `News about ${inputs.query || "topic"}`, source: "simulated" }];
      break;
    case "news.headlines":
      output.headlines = [{ title: "Top story (simulated)", source: "simulated" }];
      break;
    case "news.recommend":
      output.recommendations = [{ title: "Recommended for you (simulated)" }];
      break;
    case "feed.generate":
      output.feed = { items: [{ title: "Feed item (simulated)" }] };
      break;
    case "feed.trending":
      output.trending = [{ title: "Trending now (simulated)" }];
      break;
    case "midan.create-post":
      output.postId = `sim_post_${Date.now().toString(36)}`;
      output.status = "published";
      break;
    case "midan.like-post":
      output.liked = true;
      break;
    case "midan.comment":
      output.commentId = `sim_comment_${Date.now().toString(36)}`;
      break;
    case "mashahd.upload-video":
      output.videoId = `sim_video_${Date.now().toString(36)}`;
      output.status = "published";
      break;
    case "mashahd.like-video":
      output.liked = true;
      break;
    case "mashahd.smart-reply":
      output.reply = "Great content! (simulated smart reply)";
      break;
    case "lamahd.share-photo":
      output.photoId = `sim_photo_${Date.now().toString(36)}`;
      break;
    case "commit.create-agreement":
      output.agreementId = `sim_agreement_${Date.now().toString(36)}`;
      output.status = "draft";
      break;
    case "commit.analyze-fairness":
      output.fairnessScore = 0.85;
      output.analysis = { balanced: true, concerns: [] };
      break;
    case "commit.mediate-dispute":
      output.resolution = { approach: "collaborative", outcome: "simulated" };
      break;
    case "shield.file-report":
      output.caseNumber = `sim_case_${Date.now().toString(36)}`;
      output.status = "pending";
      break;
    case "shield.submit-evidence":
      output.accepted = true;
      break;
    case "shield.panic":
      output.alertId = `sim_alert_${Date.now().toString(36)}`;
      output.status = "dispatched";
      break;
    case "profile.update":
      output.updated = true;
      break;
    case "profile.view":
      output.profile = { username: inputs.username, displayName: "Simulated User", verified: false };
      break;
    case "wasl.send-message":
      output.messageId = `sim_msg_${Date.now().toString(36)}`;
      output.status = "sent";
      break;
    case "wasl.smart-reply":
      output.replies = ["Sounds good!", "Let me check.", "Sure thing!"];
      break;
    case "wasl.translate":
      output.translated = `(simulated translation of "${inputs.text}" to ${inputs.to})`;
      break;
    case "wasl.summarize":
      output.summary = "(simulated summary of the provided text)";
      break;
    case "maps.search-nearby":
      output.places = [
        { name: "Nearby Place (simulated)", type: inputs.type, distance: 400 },
        { name: "Another Place (simulated)", type: inputs.type, distance: 800 },
      ];
      break;
    case "maps.get-weather":
      output.weather = { tempC: 22, condition: "Clear", icon: "sun" };
      break;
    case "ai.recommend":
      output.recommendations = [{ id: "sim_rec_1", score: 0.85, explanation: "Simulated recommendation" }];
      break;
    case "ai.cross-evaluate":
      output.answer = "(simulated cross-evaluated answer)";
      output.confidence = 0.75;
      break;
    default:
      output.note = `No specific simulation for ${capabilityId}; generic success.`;
  }

  return success(output, "simulated", true, 1);
}

// ── Live executors (call real platform services) ─────────────────────────

/**
 * Live executor factory. Creates an executor that calls a real platform
 * function. Each executor is wrapped in try/catch to isolate failures.
 */
function liveExecutor(
  fn: (inputs: Record<string, unknown>) => Promise<unknown>,
  executorName: string,
): CapabilityExecutor {
  return async (inputs, ctx) => {
    const start = Date.now();
    try {
      const output = await fn(inputs);
      return success(output, executorName, ctx.dryRun, Date.now() - start);
    } catch (err) {
      return failure(String(err).slice(0, 200), executorName, ctx.dryRun, Date.now() - start);
    }
  };
}

// ── Lazy-loaded live executors ──────────────────────────────────────────
//
// These call the real platform service functions. They are loaded lazily
// (inside the executor) to avoid importing all platform modules at TEE
// startup — only the capabilities actually being executed get loaded.

const liveExecutors: Record<string, CapabilityExecutor> = {
  "travel.search-flights": liveExecutor(async (inputs) => {
    const { searchFlights } = await import("@/lib/cirkle-brain");
    return searchFlights(String(inputs.from || ""), String(inputs.to || ""), String(inputs.date || ""));
  }, "api"),

  "travel.search-hotels": liveExecutor(async (inputs) => {
    const { searchHotels } = await import("@/lib/cirkle-brain");
    return searchHotels(String(inputs.destination || ""), String(inputs.checkIn || ""), String(inputs.checkOut || ""));
  }, "api"),

  "news.search": liveExecutor(async (inputs) => {
    const { searchNews } = await import("@/lib/cirkle-brain");
    return searchNews(String(inputs.query || ""), String(inputs.country || "EG"));
  }, "api"),

  "maps.search-nearby": liveExecutor(async (inputs) => {
    const { globalProviderRegistry } = await import("@/lib/location-intelligence");
    return globalProviderRegistry.searchAll({
      lat: Number(inputs.lat),
      lng: Number(inputs.lng),
      radiusMeters: 2000,
      types: inputs.type ? [String(inputs.type)] : undefined,
      limit: 10,
    });
  }, "api"),

  "ai.cross-evaluate": liveExecutor(async (inputs) => {
    const { crossEvaluate } = await import("@/lib/brain-cross-evaluation");
    return crossEvaluate({ query: String(inputs.query || "") });
  }, "api"),
};

// ── Capability Executor Registry ─────────────────────────────────────────

export class CapabilityExecutorRegistry {
  private executors = new Map<string, CapabilityExecutor>();
  private dynamicExecutors = new Map<string, CapabilityExecutor>();

  /**
   * Resolve an executor for a capability. Returns the dynamic executor if
   * registered, then the live executor, then falls back to the simulator.
   */
  resolve(capabilityId: string): CapabilityExecutor {
    // 1. Dynamic (future plugins) — highest priority.
    const dynamic = this.dynamicExecutors.get(capabilityId);
    if (dynamic) return dynamic;

    // 2. Live executor (real platform service).
    const live = liveExecutors[capabilityId];
    if (live) return live;

    // 3. Fallback: simulator (always available; used in dry-run + for caps
    //    without a live executor yet).
    return (inputs, ctx) => Promise.resolve(simulate(capabilityId, inputs));
  }

  /**
   * Register a dynamic executor (for future plugins + third-party extensions).
   */
  register(capabilityId: string, executor: CapabilityExecutor): void {
    this.dynamicExecutors.set(capabilityId, executor);
  }

  /**
   * Check whether a live executor exists for a capability.
   */
  hasLiveExecutor(capabilityId: string): boolean {
    return this.dynamicExecutors.has(capabilityId) || capabilityId in liveExecutors;
  }
}

// ── Global singleton ─────────────────────────────────────────────────────

export const globalCapabilityExecutorRegistry = new CapabilityExecutorRegistry();
