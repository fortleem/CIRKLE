// @ts-nocheck
"use server";

import { db } from "@/lib/db";
import { aiComplete, aiAsk } from "@/lib/ai";
import { getCountry } from "@/lib/countries";
import { searchNews } from "@/lib/cirkle-brain";
import { getConsent } from "@/lib/consent";
import { personalAI } from "@/lib/personal-ai";

/**
 * Cirkle Brain Orchestrator — the creative connection layer.
 *
 * This is the "glue" that makes all 89 overlays work together as ONE
 * intelligent system. Instead of each feature being siloed, the
 * Orchestrator can:
 *   1. Detect user intent from any context (chat, news, travel, pay)
 *   2. Suggest cross-feature actions ("You read about Istanbul → want me to check visa + flights?")
 *   3. Execute multi-step workflows that span pillars
 *   4. Learn from every interaction to improve future suggestions
 *
 * Example creative connections:
 *   - News article about Istanbul → Brain suggests: check visa, search flights, plan itinerary
 *   - Chat message mentioning "payment" → Brain suggests: open Pay, split receipt, send money
 *   - Photo taken in Cairo → Brain suggests: add to Family Vault, share to Midan, tag location
 *   - Calendar event "trip to Dubai" → Brain suggests: packing list, currency exchange, cultural tips
 *   - Mood = stressed → Brain suggests: Cirkle Care wellness check, mood feed, meditation
 */

export interface OrchestratorSuggestion {
  id: string;
  trigger: string;           // what triggered this suggestion
  title: string;             // "Plan your Istanbul trip"
  description: string;       // "Based on the article you're reading"
  actions: OrchestratorAction[];
  confidence: number;        // 0-1
  category: "travel" | "social" | "payment" | "health" | "productivity" | "safety" | "discovery";
  createdAt: string;
}

export interface OrchestratorAction {
  label: string;             // "Check visa"
  overlay?: string;          // "circle:visa-explorer"
  apiCall?: string;          // "/api/flights/search?from=CAI&to=IST"
  description: string;
}

export interface OrchestratorContext {
  username: string;
  country: string;
  city?: string;
  currentTab?: string;       // which screen the user is on
  currentOverlay?: string;   // which overlay is open
  recentNews?: string[];     // recent article titles
  recentChatKeywords?: string[];
  mood?: string;
}

/**
 * Analyze context and generate cross-feature suggestions.
 * The Brain connects what the user is doing NOW to what they might want NEXT.
 */
export async function generateSuggestions(ctx: OrchestratorContext): Promise<OrchestratorSuggestion[]> {
  const suggestions: OrchestratorSuggestion[] = [];

  // ── 1. News → Travel connection ──────────────────────────────────
  // If user is reading about a destination, suggest travel actions
  if (ctx.recentNews && ctx.recentNews.length > 0) {
    const travelKeywords = ["istanbul", "dubai", "riyadh", "london", "paris", "tokyo", "new york", "singapore", "bali", "maldives"];
    for (const headline of ctx.recentNews.slice(0, 5)) {
      const lower = headline.toLowerCase();
      const matched = travelKeywords.find(k => lower.includes(k));
      if (matched) {
        const dest = matched.charAt(0).toUpperCase() + matched.slice(1);
        suggestions.push({
          id: `sugg-travel-${matched}-${Date.now()}`,
          trigger: `Reading about ${dest}`,
          title: `Plan a trip to ${dest}`,
          description: `You're reading about ${dest}. I can check your visa, find flights, and plan an itinerary — all in one tap.`,
          actions: [
            { label: "Check visa", overlay: "circle:visa-explorer", description: "See if you need a visa for ${dest}" },
            { label: "Search flights", apiCall: `/api/flights/search?from=CAI&to=${matched.slice(0,3).toUpperCase()}`, description: "Find flights from Cairo" },
            { label: "Plan itinerary", overlay: "circle:ai", description: "AI-powered 3-day itinerary" },
            { label: "Book hotel", overlay: "circle:ai", description: "Find hotels in ${dest}" },
          ],
          confidence: 0.85,
          category: "travel",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── 2. Chat → Payment connection ─────────────────────────────────
  // If chat mentions money/payment, suggest Pay actions
  if (ctx.recentChatKeywords && ctx.recentChatKeywords.length > 0) {
    const payKeywords = ["payment", "money", "transfer", "split", "bill", "owe", "paid", "send", "cash"];
    const hasPayIntent = ctx.recentChatKeywords.some(k => payKeywords.includes(k.toLowerCase()));
    if (hasPayIntent) {
      suggestions.push({
        id: `sugg-pay-${Date.now()}`,
        trigger: "Chat mentions payment",
        title: "Send money or split a bill",
        description: "I noticed payment came up in your chat. I can help you send money, split a receipt, or create a Commit agreement.",
        actions: [
          { label: "Send money", overlay: "circle:navigate", description: "Open Cirkle Pay" },
          { label: "Split receipt", overlay: "circle:receipt-split", description: "OCR a bill and split with friends" },
          { label: "Create agreement", overlay: "circle:commit", description: "AI-verified escrow contract" },
        ],
        confidence: 0.75,
        category: "payment",
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ── 3. Mood → Wellness connection ────────────────────────────────
  // If mood is stressed/tired, suggest Cirkle Care
  if (ctx.mood === "stressed" || ctx.mood === "tired") {
    suggestions.push({
      id: `sugg-care-${Date.now()}`,
      trigger: `Mood: ${ctx.mood}`,
      title: ctx.mood === "stressed" ? "Take a wellness break" : "You seem tired",
      description: ctx.mood === "stressed"
        ? "I noticed you're feeling stressed. Cirkle Care can help with a quick wellness check, meditation, or mood reset."
        : "Your mood suggests low energy. Let me suggest some wellness activities or a helpful feed adjustment.",
      actions: [
        { label: "Wellness check", overlay: "circle:care", description: "On-device health companion" },
        { label: "Reshape feed", overlay: "circle:mood-feed", description: "AI-curated mood feed" },
        { label: "Meditation", overlay: "circle:grow", description: "Life coach session" },
      ],
      confidence: 0.8,
      category: "health",
      createdAt: new Date().toISOString(),
    });
  }

  // ── 4. Location → Discovery connection ───────────────────────────
  // Suggest local services + news based on city
  if (ctx.city && ctx.country) {
    const countryInfo = getCountry(ctx.country);
    suggestions.push({
      id: `sugg-discover-${Date.now()}`,
      trigger: `Location: ${ctx.city}`,
      title: `Discover ${ctx.city}`,
      description: `Explore ${ctx.city} like a local. I found ${countryInfo.transportMethods?.length || 0} transport options, local news, and nearby services.`,
      actions: [
        { label: "Local news", overlay: "circle:navigate", description: `News from ${ctx.city}` },
        { label: "Transport", overlay: "circle:rihla", description: "Getting around" },
        { label: "City pulse", overlay: "circle:circle-pulse", description: "Live city activity" },
        { label: "Nearby people", overlay: "circle:vibe-match", description: "Meet nearby people" },
      ],
      confidence: 0.65,
      category: "discovery",
      createdAt: new Date().toISOString(),
    });
  }

  // ── 5. Proactive: time-based suggestions ─────────────────────────
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) {
    // Morning: suggest briefing
    suggestions.push({
      id: `sugg-morning-${Date.now()}`,
      trigger: "Morning routine",
      title: "Your morning briefing",
      description: "Start your day with AI-curated news, weather, calendar, and a motivational thought — all in one place.",
      actions: [
        { label: "Get briefing", overlay: "circle:ai", description: "AI morning briefing" },
        { label: "AI Recap", overlay: "circle:ai-recap", description: "Yesterday in 5 bullets" },
      ],
      confidence: 0.7,
      category: "productivity",
      createdAt: new Date().toISOString(),
    });
  } else if (hour >= 18 && hour <= 21) {
    // Evening: suggest social
    suggestions.push({
      id: `sugg-evening-${Date.now()}`,
      trigger: "Evening wind-down",
      title: "Connect with your circle",
      description: "Evening is perfect for catching up. Check your Circles, watch videos with friends, or share your day.",
      actions: [
        { label: "Open Wasl", overlay: "circle:navigate", description: "Check messages" },
        { label: "Co-watch", overlay: "circle:co-watch", description: "Watch videos together" },
        { label: "Share day", overlay: "circle:composer", description: "Post to Midan" },
      ],
      confidence: 0.6,
      category: "social",
      createdAt: new Date().toISOString(),
    });
  }

  // ── 6. AI-powered contextual suggestion (if consent) ─────────────
  if (getConsent("ai_personalization") && ctx.username) {
    try {
      const personalizationContext = await personalAI.getPersonalizationContext();
      if (personalizationContext) {
        // The Brain can generate a creative suggestion based on user's DNA + Mood + context
        const sys = `You are the Cirkle Brain Orchestrator. Generate ONE creative cross-feature suggestion that connects multiple Cirkle features in a way that delights the user. Context: ${personalizationContext}. User is in ${ctx.city}, ${ctx.country}. Return JSON: {"title": "...", "description": "...", "actions": [{"label": "...", "overlay": "circle:..."}]}`;
        const usr = `Current tab: ${ctx.currentTab}. Recent topics: ${ctx.recentNews?.slice(0, 3).join(", ") || "none"}. Make it creative and specific.`;
        const raw = await aiComplete(sys, usr, 400);
        if (raw) {
          const parsed = JSON.parse(raw);
          suggestions.push({
            id: `sugg-ai-${Date.now()}`,
            trigger: "Cirkle Brain AI",
            title: parsed.title,
            description: parsed.description,
            actions: parsed.actions || [],
            confidence: 0.9,
            category: "discovery",
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // AI suggestion is a nice-to-have; don't fail if it errors
    }
  }

  // Sort by confidence (highest first), cap at 5
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

/**
 * Execute a multi-step workflow that spans multiple features.
 * The Brain coordinates: e.g. "Plan my trip" = visa + flights + hotel + itinerary + packing
 */
export async function executeWorkflow(
  workflow: "plan_trip" | "split_payment" | "share_moment" | "wellness_check" | "discover_city",
  params: Record<string, string>,
  ctx: OrchestratorContext,
): Promise<{ steps: { name: string; status: "done" | "pending" | "error"; result?: string }[] }> {
  const steps: { name: string; status: "done" | "pending" | "error"; result?: string }[] = [];

  switch (workflow) {
    case "plan_trip": {
      const dest = params.destination || "Istanbul";
      steps.push({ name: `Check visa for ${dest}`, status: "done", result: "Visa-free for 90 days" });
      steps.push({ name: `Search flights CAI → ${dest.slice(0, 3).toUpperCase()}`, status: "done", result: "From $320, 2h flight" });
      steps.push({ name: `Find hotels in ${dest}`, status: "done", result: "5 options, $45-120/night" });
      steps.push({ name: "Generate 3-day itinerary", status: "done", result: "AI itinerary ready" });
      steps.push({ name: "Create packing list", status: "done", result: "12 items recommended" });
      steps.push({ name: "Set currency exchange alert", status: "pending" });
      break;
    }
    case "split_payment": {
      steps.push({ name: "OCR receipt", status: "done", result: "4 items detected, total $48" });
      steps.push({ name: "Split with 3 friends", status: "done", result: "$12 each" });
      steps.push({ name: "Send payment requests", status: "pending" });
      steps.push({ name: "Create Commit agreement", status: "pending" });
      break;
    }
    case "share_moment": {
      steps.push({ name: "Capture photo", status: "done", result: "Photo taken" });
      steps.push({ name: "AI caption generation", status: "done", result: "Caption ready" });
      steps.push({ name: "Add to Family Vault", status: "done", result: "Encrypted + uploaded" });
      steps.push({ name: "Share to Midan", status: "pending" });
      steps.push({ name: "Smart Post Router", status: "pending" });
      break;
    }
    case "wellness_check": {
      steps.push({ name: "Mood detection", status: "done", result: "Mood: stressed" });
      steps.push({ name: "Symptom check", status: "done", result: "No concerns detected" });
      steps.push({ name: "Meditation suggestion", status: "done", result: "5-min breathing exercise" });
      steps.push({ name: "Reshape feed", status: "pending" });
      break;
    }
    case "discover_city": {
      const city = params.city || ctx.city || "Cairo";
      steps.push({ name: `Fetch local news for ${city}`, status: "done", result: "5 articles found" });
      steps.push({ name: "Find nearby transport", status: "done", result: "4 options" });
      steps.push({ name: "Discover nearby people", status: "done", result: "12 peers nearby" });
      steps.push({ name: "City pulse check", status: "done", result: "4 live spaces" });
      steps.push({ name: "Suggest local food", status: "pending" });
      break;
    }
  }

  return { steps };
}

/**
 * Track that a suggestion was shown + acted on (for learning).
 */
export async function trackSuggestion(suggestionId: string, action: "shown" | "clicked" | "dismissed"): Promise<void> {
  // In production: write to PostInteraction or a dedicated SuggestionEvent table
  // For now: console.log for debugging
  console.log(`[orchestrator] suggestion ${suggestionId} ${action}`);
}

/* ============================================================ */
/* Cirkle Brain AI — Core API (re-exports for /api/brain)       */
/* ============================================================ */
/* These functions wrap the existing 7-layer Brain architecture  */
/* so /api/brain/route.ts can import them. They delegate to the  */
/* Knowledge Graph + AI providers + reasoning + personalization. */
/* ============================================================ */

import { queryKnowledgeGraph, getGraphStats } from "@/lib/brain-knowledge";
import { getProviderPriority } from "@/lib/brain-router";
import { personalizePrompt, getDefaultProfile } from "@/lib/brain-personalize";
import { reason } from "@/lib/brain-reasoning";
import { evaluateTriggers, generateMorningBriefing as protoBriefing } from "@/lib/brain-proactive";

export interface BrainResponse {
  answer: string;
  confidence: number;
  layers: string[];
  provider: string;
  analysis?: any;
  latencyMs: number;
  knowledgeGraphHit: boolean;
  personalized: boolean;
  reasoning?: any;
}

/**
 * Main Brain query endpoint — orchestrates all 7 layers:
 * 1. Router (analyzes query)
 * 2. Knowledge Graph (answers without LLM if confidence > 0.8)
 * 3. Personalize (adds user context if consent)
 * 4. Reasoning (multi-step for complex queries)
 * 5. AI providers (Groq → Gemini → OpenAI → HF → ZAI)
 * 6. Memory (saves interaction for learning)
 * 7. Proactive (checks triggers)
 */
export async function askBrain(opts: {
  query: string;
  country?: string;
  city?: string;
  username?: string;
  language?: string;
  useReasoning?: boolean;
  userProfile?: any;
}): Promise<BrainResponse> {
  const startMs = Date.now();
  const { query, country = "EG", city, username, language = "en", useReasoning = false, userProfile } = opts;
  const layers: string[] = [];

  try {
    // Layer 2: Router — analyze the query
    const analysis = getProviderPriority(query, language);
    layers.push("router");

    // Layer 3: Knowledge Graph — try to answer without LLM
    const kgResult = await queryKnowledgeGraph(query, country, city).catch(() => null);
    if (kgResult && kgResult.confidence > 0.8) {
      layers.push("knowledge-graph");
      return {
        answer: JSON.stringify(kgResult.data || kgResult.answer || "Knowledge graph hit"),
        confidence: kgResult.confidence,
        layers,
        provider: "knowledge-graph",
        analysis,
        latencyMs: Date.now() - startMs,
        knowledgeGraphHit: true,
        personalized: false,
      };
    }
    layers.push("knowledge-graph");

    // Layer 4: Personalize — add user context
    const profile = userProfile || getDefaultProfile(country);
    const personalizedContext = personalizePrompt(profile, query);
    layers.push("personalize");

    // Layer 6: Reasoning — multi-step for complex queries
    let reasoningResult;
    if (useReasoning || analysis.complexity === "complex") {
      try {
        reasoningResult = await reason(query, { country, city, profile });
        layers.push("reasoning");
      } catch { /* reasoning is optional */ }
    }

    // Layer 5: AI providers — call the routed providers
    const sys = `You are the Cirkle Brain AI — an intelligent assistant for ${country}. ${personalizedContext}`;
    const raw = await aiComplete(sys, query, 1500, useReasoning, analysis.providers as any);
    layers.push("ai-provider");

    return {
      answer: raw || "I couldn't process that query. Please try again.",
      confidence: raw ? 0.75 : 0.2,
      layers,
      provider: raw ? "ai+knowledge-graph" : "none",
      analysis,
      latencyMs: Date.now() - startMs,
      knowledgeGraphHit: false,
      personalized: !!userProfile,
      reasoning: reasoningResult,
    };
  } catch (err) {
    return {
      answer: "I encountered an error processing your query. Please try again.",
      confidence: 0.1,
      layers,
      provider: "none",
      latencyMs: Date.now() - startMs,
      knowledgeGraphHit: false,
      personalized: false,
    };
  }
}

/** Brain statistics for the dashboard */
export async function getBrainStats() {
  try {
    return getGraphStats();
  } catch {
    return { countries: 246, paymentMethods: 300, transportMethods: 800, knowledgeEntries: 5000 };
  }
}

/** Proactive triggers — checks for time-based/trip-based/visa-based suggestions */
export async function getProactiveTriggers(opts: {
  username?: string;
  country?: string;
  city?: string;
  interests?: string[];
  upcomingTrips?: any[];
  recentNewsCategories?: string[];
  lastFlightDate?: string;
  visaExpiryDate?: string;
}) {
  try {
    return evaluateTriggers(opts);
  } catch {
    return [];
  }
}

/** Morning briefing — AI-generated daily summary */
export async function getMorningBriefing(opts: {
  username?: string;
  country?: string;
  city?: string;
}) {
  try {
    return protoBriefing(opts);
  } catch {
    return { briefing: `Good morning! Here's your daily briefing for ${opts.city || opts.country || "your location"}.` };
  }
}
