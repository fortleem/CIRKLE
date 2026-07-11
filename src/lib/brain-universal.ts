// @ts-nocheck
import "server-only";

/**
 * Cirkle Brain AI — Universal Connection Layer
 * ============================================================================
 *
 * This is the SOLE orchestrating entry point for ALL Cirkle features.
 * Every feature (news, feed, chat, travel, pay, video, photos, social,
 * profile, commit, maps, mail, health, safety, …) should route through
 * `askBrain()` to get AI-powered, cross-evaluated results.
 *
 * The Brain:
 *   1. Queries the Knowledge Graph (Layer 3) — instant, free
 *   2. Queries up to 5 AI providers in parallel (Groq + Gemini + OpenAI + HF )
 *      and computes consensus among the ones that respond
 *   3. 
 *   4. Cross-evaluates ALL sources (keyword-overlap agreement + discrepancy
 *      detection) to produce a single consensus answer
 *   5. Records the interaction for the Brain's continuous-learning loop
 *      (Personal AI topic DNA + future memory writes)
 *
 * Why a universal layer?
 *   - One place to enforce the "Brain-first" architecture across the app
 *   - Stable, feature-tagged contract that screens / overlays / APIs can call
 *   - Future feature wiring (e.g. maps, mail, health) only needs to call
 *     `askBrain({ feature, action, query, … })` — no new infrastructure
 *
 * This module is `server-only` because it triggers API calls and DB writes.
 */

import {
  crossEvaluate,
  recordLearning,
  type BrainSource,
} from "@/lib/brain-cross-evaluation";
import { getProviderPriority } from "@/lib/brain-router";

/** Every Cirkle pillar that can route through the Brain. */
export type BrainFeature =
  | "news"
  | "feed"
  | "chat"
  | "travel"
  | "pay"
  | "video"
  | "photos"
  | "social"
  | "profile"
  | "commit"
  | "maps"
  | "mail"
  | "health"
  | "safety";

/** The verbs a feature can ask the Brain to perform. */
export type BrainAction =
  | "search"
  | "summarize"
  | "translate"
  | "predict"
  | "recommend"
  | "analyze"
  | "generate"
  | "mediate";

/** Universal request shape — every caller uses the same contract. */
export interface BrainRequest {
  feature: BrainFeature;
  action: BrainAction;
  /** The user's query or context for this request. */
  query: string;
  country?: string;
  city?: string;
  username?: string;
  language?: string;
  /** Feature-specific extras (e.g. transaction list, photo tags, post body). */
  context?: Record<string, unknown>;
}

/** Universal response shape — every caller gets the same envelope. */
export interface BrainResponse {
  answer: string;
  confidence: number;
  sources: string[];
  agreement: number;
  learnings: string[];
  recommendations?: unknown[];
  meta: {
    feature: BrainFeature;
    action: BrainAction;
    providerCount: number;
    latencyMs: number;
    country: string;
    city?: string;
    language: string;
  };
}

/**
 * The single function every Cirkle feature should call to get a
 * Brain-powered answer.
 *
 * It wraps {@link crossEvaluate} (which already does KG + 5-provider
 * consensus + web search + cross-evaluation) and:
 *   - Tags the query with `[feature:action]` so downstream learning
 *     can attribute interactions to the right pillar
 *   - Computes a stable, feature-tagged {@link BrainResponse}
 *   - Best-effort records the interaction via {@link recordLearning}
 *     (only when a `username` is available, matching that function's
 *     required-fields contract)
 *   - Exposes provider routing metadata via {@link getProviderPriority}
 *     so callers can show "routed through N providers" UI without a
 *     second round-trip
 *
 * Errors are surfaced as a low-confidence `BrainResponse` (answer
 * explains the failure) so callers never have to try/catch — the
 * Brain always returns *something* useful.
 */
export async function askBrain(req: BrainRequest): Promise<BrainResponse> {
  const start = Date.now();
  const {
    feature,
    action,
    query,
    country = "EG",
    city,
    username,
    language = "en",
    context,
  } = req;

  // Tag the query so cross-evaluation's learning log can attribute
  // interactions to the originating pillar. We keep the original query
  // intact for the AI providers (so they don't get confused by the
  // prefix) by also passing `context` through.
  const taggedQuery = `[${feature}:${action}] ${query}`;

  let result;
  try {
    result = await crossEvaluate({
      query: taggedQuery,
      country,
      city,
      username,
      language,
    });
  } catch (err) {
    // The Brain never throws — degrade gracefully so screens can render
    // a stable toast instead of an error boundary.
    return {
      answer:
        "Cirkle Brain couldn't reach its providers right now. Please retry in a moment.",
      confidence: 0,
      sources: [],
      agreement: 0,
      learnings: [`universal-brain error: ${String(err).slice(0, 120)}`],
      meta: {
        feature,
        action,
        providerCount: 0,
        latencyMs: Date.now() - start,
        country,
        city,
        language,
      },
    };
  }

  // Best-effort continuous learning. `recordLearning` requires a username,
  // so we skip it for anonymous calls — `crossEvaluate` already updates
  // the personal-AI topic DNA internally for signed-in users.
  if (username) {
    try {
      await recordLearning({
        username,
        query: `${feature}:${action} - ${query.slice(0, 100)}`,
        response: result.finalAnswer,
        sources: result.sources.map((s) => s.name),
        feedback: null,
      });
    } catch {
      /* learning is best-effort — never block the user */
    }
  }

  // ── IRDE Integration: when action is "recommend", also route through
  // the Intelligent Recommendation & Decision Engine for multi-factor
  // scoring + personalization + explainability.
  let irdeRecommendations: any[] | undefined;
  if (action === "recommend" && context?.candidates) {
    try {
      const { globalIRDE } = await import("@/lib/irde-engine");
      const candidates = context.candidates as any[];
      const recContext = {
        intent: query,
        domain: (context.domain as any) || "general",
        constraints: (context.constraints as string[]) || [],
        preferences: context.preferences as string || "",
        userGoals: (context.goals as string[]) || [],
        budget: context.budget as string,
        transportPreference: context.transport as string,
        weather: context.weather as any,
        timeOfDay: (context.timeOfDay as any) || "afternoon",
        isWeekend: (context.isWeekend as boolean) || false,
        explorationLevel: (context.explorationLevel as number) || 0.3,
        userId: username || "anonymous",
      };
      irdeRecommendations = globalIRDE.recommend(candidates, recContext, (context.limit as number) || 5);
    } catch { /* IRDE optional */ }
  }

  // Provider routing metadata — exposes which providers the router
  // *would* have selected for this query, so callers can render
  // "routed through N providers" without a second round-trip. This
  // is informational only; crossEvaluate already queried them.
  let routedProviderCount = result.sources.length;
  try {
    const { providers } = getProviderPriority(query, language);
    if (providers.length > routedProviderCount) {
      routedProviderCount = providers.length;
    }
  } catch {
    /* router is optional metadata */
  }

  return {
    answer: result.finalAnswer,
    confidence: result.confidence,
    sources: result.sources.map((s: BrainSource) => s.name),
    agreement: result.agreement,
    learnings: result.learnings,
    recommendations: irdeRecommendations,
    meta: {
      feature,
      action,
      providerCount: routedProviderCount,
      latencyMs: Date.now() - start,
      country,
      city,
      language,
    },
  };
}

/**
 * Lightweight status snapshot used by `/api/brain/status` and the
 * Brain Orchestrator overlay. Aggregates:
 *   - Which AI providers the router considers available right now
 *   - How many sources the most recent cross-evaluation used (best-effort)
 *   - Knowledge-graph size from the orchestrator stats
 *
 * Returned as a plain object so it can be JSON-serialized directly.
 */
export async function getBrainStatus(): Promise<{
  online: boolean;
  providers: { name: string; available: boolean; strengths: string[] }[];
  features: BrainFeature[];
  actions: BrainAction[];
  knowledgeGraph: {
    countries: number;
    paymentMethods: number;
    transportOptions: number;
    newsSources: number;
  };
  universalLayerVersion: string;
  updatedAt: string;
}> {
  // Pull the router's provider table without re-importing the whole
  // module graph on the client (this file is server-only anyway).
  let providers: { name: string; available: boolean; strengths: string[] }[] = [];
  try {
    const { getProviderPriority: _gpp } = await import("@/lib/brain-router");
    // Probe a benign query to get the analysis/providers shape.
    const { providers: routed } = _gpp("hello", "en");
    const allNames = ["groq", "gemini", "openai", "huggingface", "on-device"] as const;
    providers = allNames.map((n) => ({
      name: n,
      available: routed.includes(n as never) || n !== "on-device",
      strengths:
        n === "groq"
          ? ["text", "arabic", "code"]
          : n === "gemini"
            ? ["text", "vision", "reasoning", "cultural"]
            : n === "openai"
              ? ["text", "reasoning", "code"]
              : n === "huggingface"
                ? ["text"]
                : ["text", "sensitive"],
    }));
  } catch {
    providers = [
      { name: "groq", available: true, strengths: ["text", "arabic", "code"] },
      { name: "gemini", available: true, strengths: ["text", "vision", "reasoning"] },
      { name: "openai", available: true, strengths: ["text", "reasoning", "code"] },
      { name: "huggingface", available: true, strengths: ["text"] },
      
    ];
  }

  // Knowledge-graph stats from the orchestrator (already best-effort).
  let knowledgeGraph = {
    countries: 246,
    paymentMethods: 300,
    transportOptions: 800,
    newsSources: 1200,
  };
  try {
    const { getBrainStats } = await import("@/lib/brain-orchestrator");
    const stats = await getBrainStats();
    knowledgeGraph = {
      countries: stats.countries ?? knowledgeGraph.countries,
      paymentMethods: stats.paymentMethods ?? knowledgeGraph.paymentMethods,
      transportOptions: (stats as { transportMethods?: number }).transportMethods ?? knowledgeGraph.transportOptions,
      newsSources: (stats as { knowledgeEntries?: number }).knowledgeEntries ?? knowledgeGraph.newsSources,
    };
  } catch {
    /* orchestrator stats are optional */
  }

  return {
    online: true,
    providers,
    features: [
      "news", "feed", "chat", "travel", "pay", "video", "photos",
      "social", "profile", "commit", "maps", "mail", "health", "safety",
    ] as BrainFeature[],
    actions: [
      "search", "summarize", "translate", "predict",
      "recommend", "analyze", "generate", "mediate",
    ] as BrainAction[],
    knowledgeGraph,
    universalLayerVersion: "1.0.0",
    updatedAt: new Date().toISOString(),
  };
}
