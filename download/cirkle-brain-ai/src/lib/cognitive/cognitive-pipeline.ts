/**
 * CIRKLE Brain AI — Cognitive Pipeline
 * ============================================================================
 *
 * Phase 4.5 — Shared Cognitive Foundation
 *
 * The Cognitive Pipeline is an OPTIONAL orchestrator that demonstrates the
 * Shared Context Object flowing through the existing intelligence phases
 * WITHOUT modifying them.
 *
 * Constitutional constraint (Part 3): existing ownership remains unchanged.
 * Therefore this pipeline does NOT rewrite, merge, or bypass any phase. It:
 *   1. Creates a Shared Context via the Context Manager.
 *   2. Calls each phase's EXISTING public API (no modifications).
 *   3. Enriches the Shared Context with each phase's output (ownership-enforced).
 *   4. Returns the enriched context + a trace.
 *
 * This pipeline is a PRECURSOR to the future UOB (Phase 5). UOB will replace
 * this lightweight orchestrator with a full platform-aware orchestration
 * layer. The Shared Context contract this pipeline establishes is the stable
 * foundation UOB will build on.
 *
 * Why optional? Because the existing `askBrain()` entry points and feature
 * APIs continue to work unchanged (backward compatibility). The pipeline is
 * the NEW, context-first path that future code SHOULD prefer.
 *
 * NOT intelligent: this orchestrator does not reason. It only sequences
 * phases and records provenance. Reasoning belongs to CRIE; decisions belong
 * to IRDE.
 * ============================================================================
 */

import "server-only";

import { globalContextManager } from "./context-manager";
import { globalCapabilityRegistry } from "./capability-registry";
import { ensureCapabilitiesSeeded } from "./capability-seed";
import type { SharedContext, GeographicContext, UserContext, ReasoningContext, ValidationContext, RecommendationContext } from "./shared-context";

// Import existing phase APIs (read-only — we do NOT modify them).
import { globalLearningEngine } from "@/lib/location-intelligence";
import { personalAI } from "@/lib/personal-ai";
import { globalCRIE } from "@/lib/crie-engine";
import { globalIRDE, type CandidateEntity } from "@/lib/irde-engine";

// ── Pipeline input ───────────────────────────────────────────────────────

export interface CognitivePipelineInput {
  /** The user's request text. */
  query: string;
  language?: string;
  surface?: string;
  featureTag?: string;
  username?: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  /** Optional candidate entities for IRDE to rank (from GCIE or caller). */
  candidates?: CandidateEntity[];
  /** Limit for IRDE recommendations. */
  limit?: number;
  /** Skip phases (for partial pipelines / debugging). */
  skip?: Array<"gcie" | "pmb" | "crie" | "cross-eval" | "irde">;
}

// ── Pipeline output ──────────────────────────────────────────────────────

/** Provenance trail returned by ContextManager.trace(). */
export interface ContextTrace {
  requestId: string;
  versions: number;
  frozen: boolean;
  trail: { source: string; timestamp: string; version: number; operation: string; reason?: string }[];
}

/** Compact debug summary returned by ContextManager.debug(). */
export interface ContextDebug {
  requestId: string;
  version: number;
  confidence: number;
  sections: string[];
  provenanceCount: number;
  frozen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CognitivePipelineResult {
  /** The final enriched Shared Context (frozen). */
  context: SharedContext;
  /** The trace of what happened (provenance trail). */
  trace: ContextTrace;
  /** Debug summary. */
  debug: ContextDebug;
  /** Convenience: the top recommendation if IRDE ran. */
  topRecommendation?: CandidateEntity & { overallScore?: number; confidence?: number; explanation?: string };
  /** Capabilities the pipeline discovered as potentially relevant. */
  relevantCapabilities?: string[];
}

// ── Pipeline ─────────────────────────────────────────────────────────────

/**
 * Run the cognitive pipeline: create context → enrich through phases → freeze.
 *
 * Each step is wrapped in try/catch so a single phase failure does NOT abort
 * the whole pipeline. The context still flows forward with whatever sections
 * succeeded. This preserves robustness (Ch.2 §2.9 explainability + graceful
 * degradation).
 */
export async function runCognitivePipeline(input: CognitivePipelineInput): Promise<CognitivePipelineResult> {
  // Ensure the Capability Registry is seeded (idempotent).
  ensureCapabilitiesSeeded();

  const skip = new Set(input.skip ?? []);

  // ── Step 1: Create the Shared Context ────────────────────────────────
  let ctx = globalContextManager.create({
    request: input.query,
    language: input.language,
    surface: input.surface,
    featureTag: input.featureTag,
  });

  // ── Step 2: GCIE — enrich Geographic Context ─────────────────────────
  if (!skip.has("gcie") && typeof input.lat === "number" && typeof input.lng === "number") {
    try {
      const prefs = input.username ? globalLearningEngine.getPreferences(input.username) : undefined;
      const places = await globalProviderSearchSafe(input.lat, input.lng, input.city, input.country);
      const geo: GeographicContext = {
        location: { lat: input.lat, lng: input.lng, city: input.city, country: input.country },
        nearbyEntities: places.slice(0, 10).map((p) => ({ type: p.type, name: p.name, distance: p.distanceMeters ?? 0 })),
      };
      ctx = globalContextManager.enrich(ctx, "geographic", geo, "gcie", { reason: "GCIE nearby search" });
      void prefs; // preferences feed PMB, not GCIE section
    } catch {
      /* GCIE failure is non-fatal */
    }
  }

  // ── Step 3: PMB — enrich User Context ────────────────────────────────
  if (!skip.has("pmb") && input.username) {
    try {
      const personalizationCtx = await personalAI.getPersonalizationContext();
      const user: UserContext = {
        identity: { username: input.username },
        preferences: personalizationCtx,
      };
      ctx = globalContextManager.enrich(ctx, "user", user, "pmb", { reason: "PMB personalization context" });
    } catch {
      /* PMB failure is non-fatal */
    }
  }

  // ── Step 4: CRIE — enrich Reasoning Context ──────────────────────────
  if (!skip.has("crie")) {
    try {
      const intent = globalCRIE.understandIntent(input.query, []);
      const reasoning: ReasoningContext = {
        intent: intent.primary,
        intentType: intent.primary,
        urgency: intent.urgency,
        constraints: [...intent.constraints, ...intent.hiddenConstraints],
        clarifications: intent.secondary ? [intent.secondary] : [],
        confidence: intent.confidence,
        assumptions: [],
        decisionType: intent.expectedOutput,
      };
      ctx = globalContextManager.enrich(ctx, "reasoning", reasoning, "crie", { reason: `CRIE intent: ${intent.primary}` });
    } catch {
      /* CRIE failure is non-fatal */
    }
  }

  // ── Step 5: Cross-Evaluation — enrich Validation Context ─────────────
  // Lightweight: we record that validation is available but defer the heavy
  // multi-provider call to the existing askBrain/crossEvaluate path. This
  // keeps the pipeline cheap and avoids duplicating the cross-eval logic.
  if (!skip.has("cross-eval")) {
    const validation: ValidationContext = {
      validationConfidence: 0.5,
    };
    try {
      ctx = globalContextManager.enrich(ctx, "validation", validation, "cross-eval", { reason: "Validation placeholder (cross-eval runs via askBrain)" });
    } catch {
      /* non-fatal */
    }
  }

  // ── Step 6: IRDE — enrich Recommendation Context ─────────────────────
  let topRecommendation: CognitivePipelineResult["topRecommendation"];
  if (!skip.has("irde") && input.candidates && input.candidates.length > 0) {
    try {
      const recContext = {
        intent: input.query,
        domain: "general" as const,
        constraints: [],
        preferences: ctx.user?.preferences ?? "",
        userGoals: [],
        timeOfDay: "afternoon" as const,
        isWeekend: false,
        explorationLevel: 0.3,
        userId: input.username ?? "anonymous",
      };
      const recs = globalIRDE.recommend(input.candidates, recContext, input.limit ?? 5);
      const recSection: RecommendationContext = {
        rankedCandidates: recs.map((r) => ({ id: r.entity.id, name: r.entity.name, overallScore: r.overallScore, confidence: r.confidence })),
        recommendationRationale: recs[0]?.explanation,
      };
      ctx = globalContextManager.enrich(ctx, "recommendation", recSection, "irde", { reason: `IRDE ranked ${recs.length} candidates` });
      if (recs[0]) {
        topRecommendation = { ...recs[0].entity, overallScore: recs[0].overallScore, confidence: recs[0].confidence, explanation: recs[0].explanation };
      }
    } catch {
      /* IRDE failure is non-fatal */
    }
  }

  // ── Step 7: Discover relevant capabilities (for future UOB) ──────────
  let relevantCapabilities: string[] | undefined;
  try {
    const discovered = globalCapabilityRegistry.search({ availableOnly: true, limit: 20 });
    relevantCapabilities = discovered.map((c) => c.id);
  } catch {
    /* non-fatal */
  }

  // ── Step 8: Freeze + return ──────────────────────────────────────────
  const frozen = globalContextManager.freeze(ctx);

  return {
    context: frozen,
    trace: globalContextManager.trace(frozen),
    debug: globalContextManager.debug(frozen),
    ...(topRecommendation ? { topRecommendation } : {}),
    ...(relevantCapabilities ? { relevantCapabilities } : {}),
  };
}

// ── Safe wrappers (isolate phase failures) ──────────────────────────────

async function globalProviderSearchSafe(lat: number, lng: number, _city?: string, _country?: string) {
  try {
    const { globalProviderRegistry } = await import("@/lib/location-intelligence");
    const places = await globalProviderRegistry.searchAll({ lat, lng, radiusMeters: 2000, limit: 10 });
    return places;
  } catch {
    return [];
  }
}
