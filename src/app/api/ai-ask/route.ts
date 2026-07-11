import { NextRequest, NextResponse } from "next/server";
import { aiAsk } from "@/lib/ai";
import { getCountry, getDefaultCountry } from "@/lib/countries";
import { buildUserProfile, type UserProfile } from "@/lib/brain-personalize";

/**
 * POST /api/ai-ask
 *
 * Two modes (selected by the `mode` field in the JSON body):
 *
 *  1. `mode: "build-profile"` (used by the client-side `useBrainLearning` hook):
 *     Body: { mode, interactions: Array<{query,response,category,feedback?}>, country }
 *     Returns: { profile: UserProfile }
 *     This is required because `brain-personalize.ts` is marked `server-only`
 *     (it imports `aiComplete`, which reads provider keys from `process.env`).
 *     The client cannot import `buildUserProfile` directly, so it delegates
 *     to this route.
 *
 *  2. Default mode (the AI assistant chat):
 *     Body: { message, country, city?, userProfile? }
 *     Returns: { reply: string }
 *     If `userProfile` is supplied, it is forwarded into the LLM system prompt
 *     via `personalizePrompt` (called inside `aiAsk`) so the reply adapts to
 *     the user's learned communication style, response length, language, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const mode = (body as { mode?: string }).mode;

    // ── Mode 1: build-profile ─────────────────────────────────────────
    if (mode === "build-profile") {
      const interactions = Array.isArray((body as { interactions?: unknown }).interactions)
        ? (body as { interactions: unknown[] }).interactions
        : [];
      const countryRaw = (body as { country?: string }).country;
      const countryCode = (countryRaw || getDefaultCountry()).toUpperCase();
      // `buildUserProfile` accepts a permissive interaction shape; we forward
      // only the fields it reads (query, response, category, feedback).
      const trimmed = interactions
        .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
        .map((i) => ({
          query: String((i as { query?: unknown }).query ?? ""),
          response: String((i as { response?: unknown }).response ?? ""),
          category: String((i as { category?: unknown }).category ?? "assistant"),
          feedback:
            (i as { feedback?: unknown }).feedback === "positive" ||
            (i as { feedback?: unknown }).feedback === "negative"
              ? ((i as { feedback?: string }).feedback as string)
              : undefined,
        }));
      const profile = await buildUserProfile(trimmed, countryCode);
      return NextResponse.json({ profile });
    }

    // ── Mode 2: AI assistant chat (via Cirkle Brain AI cross-evaluation) ──
    // The Brain is the PRIMARY orchestrator — it queries 5 AI providers in
    // consensus + web search + knowledge graph, then cross-evaluates for the
    // best answer. This replaces the old single-provider aiAsk() path.
    const { message, country, city, userProfile, personalizationContext, personalAIConsent } = body as {
      message?: string;
      country?: string;
      city?: string;
      userProfile?: UserProfile;
      personalizationContext?: string;
      personalAIConsent?: boolean;
    };
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    const countryCode = (country || getDefaultCountry()).toUpperCase();
    const useFullContext =
      personalAIConsent === true &&
      typeof personalizationContext === "string" &&
      personalizationContext.trim().length > 0;
    const ctxPrefix = useFullContext
      ? `[Personal AI context: ${personalizationContext}]\n\n`
      : "";

    // PRIMARY: Use Cirkle Brain AI cross-evaluation (5-provider consensus + web search + KG)
    try {
      const { crossEvaluate } = await import("@/lib/brain-cross-evaluation");
      const result = await crossEvaluate({
        query: `${ctxPrefix}${message}`,
        country: countryCode,
        city: city as string | undefined,
        username: (body as { username?: string }).username,
        language: "en",
      });

      if (result.finalAnswer && result.finalAnswer.length > 10) {
        // Record learning
        try {
          const { recordLearning } = await import("@/lib/brain-cross-evaluation");
          await recordLearning({
            username: (body as { username?: string }).username || "anonymous",
            query: message,
            response: result.finalAnswer || "",
            sources: result.sources.map(s => s.name),
          });
        } catch { /* learning is best-effort */ }

        // ── PMB Persistence: write interaction memory ──────────────────────
        // Every AI interaction is saved to PMB so the Brain remembers user
        // context across sessions. Consent-gated: only stores if user has
        // granted ai_personalization consent or if personalAIConsent is true.
        try {
          if (personalAIConsent === true || personalAIConsent === undefined) {
            const { globalPMB } = await import("@/lib/personal-memory-brain");
            const username = (body as { username?: string }).username || "anonymous";
            if (!globalPMB.isPaused(username)) {
              globalPMB.store({
                userUuid: username,
                type: "conversation",
                subcategory: "ai_chat",
                title: message.slice(0, 100),
                summary: `User asked: "${message.slice(0, 60)}..." — Brain answered (confidence: ${result.confidence.toFixed(2)})`,
                content: `Q: ${message}\nA: ${result.finalAnswer?.slice(0, 500) || ""}`,
                importanceScore: 0.5,
                confidenceScore: result.confidence,
                source: "ai_inferred",
                sourceTimestamp: new Date().toISOString(),
                lifecycle: "candidate",
                privacyLevel: "personal",
                expirationPolicy: "never",
                tags: ["ai_chat", "brain", countryCode],
                relatedMemories: [],
                gcieReferenceIds: [],
              });
            }
          }
        } catch { /* PMB persistence is best-effort */ }

        return NextResponse.json({
          reply: result.finalAnswer,
          meta: {
            sources: result.sources.map(s => s.name),
            confidence: result.confidence,
            agreement: result.agreement,
            providerCount: result.sources.length,
          },
        });
      }
    } catch { /* cross-evaluation failed — fall through to single-provider */ }

    // FALLBACK: Single-provider aiAsk (if cross-evaluation fails)
    const reply = await aiAsk(
      `${ctxPrefix}${message}`,
      getCountry(countryCode),
      userProfile || null,
    );
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "AI failed", reply: "I'm here — could you rephrase?" },
      { status: 500 },
    );
  }
}
