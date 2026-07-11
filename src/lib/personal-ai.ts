/**
 * Cirkle Personal AI — Unified on-device personal AI operating system.
 *
 * Feature 5: Cirkle DNA + Mood as a unified personal AI OS.
 *
 * Unifies the existing DNA, Mood, Topic DNA, AI Recap, and Group Memory
 * overlays into one on-device personal AI that learns the user and powers
 * all other features.
 *
 * 100% on-device: all reads + writes go through the Brain's IndexedDB
 * (`brain-memory.ts`). No raw DNA/Mood data ever leaves the device. The
 * only thing that ever crosses to the server is a *derived*
 * `personalizationContext` string (the user can revoke this at any time
 * via the Integration tab — consent is stored locally and defaults off).
 */

"use client";

import {
  openBrainDB,
  getRecentInteractions,
  getTopInterests,
  updateInterest,
  savePreference,
  getPreference,
  type BrainInteraction,
  type InterestNode,
} from "./brain-memory";

// ── Types ────────────────────────────────────────────────────────────────

/** Cirkle DNA — stable personality fingerprint (updates weekly). */
export interface CirkleDNA {
  bigFive: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  values: string[]; // e.g., ["privacy", "family", "adventure"]
  communicationStyle: "direct" | "diplomatic" | "playful" | "formal";
  interests: { topic: string; weight: number }[];
  learningStyle: "visual" | "auditory" | "kinesthetic" | "reading";
  updatedAt: string;
}

/** Cirkle Mood — real-time emotional state (updates per session). */
export interface CirkleMood {
  current:
    | "joyful"
    | "calm"
    | "focused"
    | "excited"
    | "tired"
    | "stressed"
    | "neutral";
  energy: number; // 0-100
  valence: number; // -100 (negative) to 100 (positive)
  confidence: number; // 0-1
  detectedAt: string;
  signals: { source: string; value: number }[];
}

/** Topic DNA — interest evolution over time. */
export interface TopicDNA {
  topic: string;
  weight: number; // 0-100
  trend: "rising" | "stable" | "declining";
  firstSeen: string;
  lastSeen: string;
  relatedTopics: string[];
}

export interface GroupMemoryItem {
  id: string;
  circleId: string;
  title: string;
  caption: string;
  createdAt: string;
  kind: "moment" | "milestone" | "summary" | "photo";
}

export interface UnifiedProfile {
  dna: CirkleDNA | null;
  mood: CirkleMood | null;
  topics: TopicDNA[];
  interests: string[];
}

export interface MoodSignals {
  typing_speed?: number; // chars/sec
  session_duration?: number; // ms
  content_sentiment?: number; // -1 (negative) .. 1 (positive)
  time_of_day?: number; // 0..23 hour of day
}

// ── Constants ────────────────────────────────────────────────────────────

const DNA_KEY = "cirkle-dna";
const MOOD_KEY = "cirkle-mood";
const TOPIC_DNA_KEY = "cirkle-topic-dna";
const GROUP_MEM_KEY = "cirkle-group-memory";
const CONSENT_KEY = "cirkle-personal-ai-consent";
const DNA_REBUILD_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

/** Default DNA used as a fallback when no interactions exist yet. */
function defaultDNA(): CirkleDNA {
  return {
    bigFive: {
      openness: 60,
      conscientiousness: 60,
      extraversion: 50,
      agreeableness: 60,
      neuroticism: 40,
    },
    values: ["privacy", "learning", "connection"],
    communicationStyle: "diplomatic",
    interests: [],
    learningStyle: "reading",
    updatedAt: new Date(0).toISOString(),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Tiny keyword-based interest classifier (no external deps). */
const INTEREST_KEYWORDS: Record<string, string[]> = {
  technology: ["ai", "code", "tech", "software", "app", "programming", "developer", "computer", "data"],
  travel: ["travel", "trip", "flight", "hotel", "vacation", "passport", "visa", "explore"],
  food: ["food", "eat", "restaurant", "cook", "recipe", "cuisine", "dish", "flavor"],
  art: ["art", "paint", "draw", "design", "creative", "music", "song", "poem", "poetry"],
  business: ["business", "startup", "market", "invest", "money", "finance", "trade", "company"],
  health: ["health", "fitness", "exercise", "workout", "gym", "meditate", "wellness", "sleep"],
  family: ["family", "kids", "children", "parent", "mother", "father", "brother", "sister"],
  culture: ["culture", "history", "heritage", "tradition", "language", "arabic", "quran"],
  science: ["science", "physics", "biology", "research", "study", "experiment", "theory"],
  sports: ["sport", "football", "soccer", "basketball", "tennis", "run", "cycling"],
};

function classifyTopic(text: string): string | null {
  const lower = text.toLowerCase();
  let best: { topic: string; score: number } | null = null;
  for (const [topic, words] of Object.entries(INTEREST_KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      if (lower.includes(w)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { topic, score };
    }
  }
  return best ? best.topic : null;
}

/** Sentiment heuristic: counts positive/negative cue words. */
const POSITIVE_CUES = ["good", "great", "love", "happy", "amazing", "thanks", "wonderful", "excellent", "nice", "perfect", "enjoy"];
const NEGATIVE_CUES = ["bad", "hate", "sad", "angry", "awful", "terrible", "broken", "fail", "wrong", "hurt", "upset"];

function sentimentScore(text: string): number {
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE_CUES) if (lower.includes(w)) pos += 1;
  for (const w of NEGATIVE_CUES) if (lower.includes(w)) neg += 1;
  if (pos + neg === 0) return 0;
  return (pos - neg) / (pos + neg); // -1..1
}

/** Communication style heuristic from query text. */
function detectCommStyle(queries: string[]): CirkleDNA["communicationStyle"] {
  if (queries.length === 0) return "diplomatic";
  const joined = queries.join(" ").toLowerCase();
  // Direct: short questions, imperatives
  const shortQs = queries.filter((q) => q.split(/\s+/).length < 6).length;
  const directness = shortQs / queries.length;
  // Playful: emojis / slang
  const playfulCues = (joined.match(/😂|😄|😎|🤣|haha|lol|yay/g) || []).length;
  // Formal: long sentences / formal words
  const formalCues = (joined.match(/\bplease\b|\bkindly\b|\bappreciate\b|\bregards\b|\brespectfully\b/g) || []).length;
  if (playfulCues > formalCues && playfulCues > 0) return "playful";
  if (formalCues > playfulCues) return "formal";
  if (directness > 0.6) return "direct";
  return "diplomatic";
}

/** Big Five heuristic — derived from interaction patterns. */
function deriveBigFive(interactions: BrainInteraction[]): CirkleDNA["bigFive"] {
  if (interactions.length === 0) {
    return defaultDNA().bigFive;
  }
  const queries = interactions.map((i) => i.query);
  const joined = queries.join(" ").toLowerCase();
  const avgLen =
    queries.reduce((s, q) => s + q.split(/\s+/).length, 0) / queries.length;
  // openness: varied vocabulary, longer queries, asks about diverse topics
  const uniqueWords = new Set(joined.split(/\W+/).filter(Boolean)).size;
  const openness = clamp(Math.round(40 + uniqueWords / 5 + avgLen), 20, 95);
  // conscientiousness: asks detailed follow-ups, accepts feedback
  const detailedCues = (joined.match(/\bhow\b|\bwhy\b|\bsteps?\b|\bplan\b|\borganize\b/g) || []).length;
  const positiveFbRate = interactions.filter((i) => i.feedback === "positive").length / interactions.length;
  const conscientiousness = clamp(Math.round(40 + detailedCues * 3 + positiveFbRate * 20), 20, 95);
  // extraversion: shorter, faster, more social cues
  const socialCues = (joined.match(/\bfriend\b|\bshare\b|\bpeople\b|\bgroup\b|\bchat\b/g) || []).length;
  const extraversion = clamp(Math.round(40 + socialCues * 3 - avgLen * 0.5 + 20), 20, 95);
  // agreeableness: positive sentiment, gratitude
  const agreeCues = (joined.match(/\bthanks?\b|\bplease\b|\bhelp\b|\bsorry\b|\bappreciate\b/g) || []).length;
  const agreeableness = clamp(Math.round(45 + agreeCues * 4 + positiveFbRate * 15), 20, 95);
  // neuroticism: negative sentiment, worry cues
  const worryCues = (joined.match(/\bworry\b|\banxious\b|\bstress\b|\bafraid\b|\boverwhelm/g) || []).length;
  const negSentiment = interactions.filter((i) => sentimentScore(i.query) < 0).length / interactions.length;
  const neuroticism = clamp(Math.round(30 + worryCues * 5 + negSentiment * 30), 10, 90);
  return { openness, conscientiousness, extraversion, agreeableness, neuroticism };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Compute a simple trend from interaction timestamps + weight history. */
function computeTrend(now: number, lastSeen: number, weight: number): TopicDNA["trend"] {
  // If the topic was seen within 24h AND weight > 30, it's rising.
  // If not seen in 14+ days, it's declining. Otherwise stable.
  const dayMs = 24 * 60 * 60 * 1000;
  if (now - lastSeen < dayMs && weight >= 30) return "rising";
  if (now - lastSeen > 14 * dayMs) return "declining";
  return "stable";
}

// ── Consent (local-only, defaults off) ───────────────────────────────────

/**
 * Returns true if the user has explicitly granted consent for their
 * personalization context to be sent to the AI providers via the server.
 * Defaults to `false` until the user opts in (e.g., via the Integration tab).
 */
export async function getPersonalAIConsent(): Promise<boolean> {
  try {
    const v = await getPreference<boolean>(CONSENT_KEY);
    return v === true;
  } catch {
    return false;
  }
}

/** Enable or disable personal-AI context sharing. Persists to IndexedDB. */
export async function setPersonalAIConsent(enabled: boolean): Promise<void> {
  try {
    await savePreference(CONSENT_KEY, enabled);
  } catch {
    // Best-effort — never throw.
  }
}

// ── PersonalAI class ─────────────────────────────────────────────────────

export class PersonalAI {
  // ── DNA ───────────────────────────────────────────────────────────────

  /**
   * Rebuild the Cirkle DNA fingerprint from the on-device interaction
   * history. Should run weekly (caller's responsibility) or on-demand
   * via the "Rebuild DNA" button in the Personal AI OS dashboard.
   *
   * Heuristic-only — no LLM call required, so it works fully offline.
   */
  async rebuildDNA(): Promise<CirkleDNA> {
    try {
      await openBrainDB();
      const interactions = await getRecentInteractions(200);
      const topInterests = await getTopInterests(10);

      const queries = interactions.map((i) => i.query);
      const bigFive = deriveBigFive(interactions);
      const communicationStyle = detectCommStyle(queries);

      // Values — derive from dominant positive-valued interest categories
      const values: string[] = [];
      const sentimentByCat: Record<string, number> = {};
      for (const i of interactions) {
        const cat = classifyTopic(i.query);
        if (!cat) continue;
        sentimentByCat[cat] = (sentimentByCat[cat] || 0) + sentimentScore(i.query);
      }
      const sortedCats = Object.entries(sentimentByCat).sort((a, b) => b[1] - a[1]);
      for (const [cat, score] of sortedCats.slice(0, 3)) {
        if (score > 0) values.push(cat);
      }
      if (values.length === 0) values.push("privacy", "learning", "connection");

      // Interests — map from the brain's interest graph
      const interests = topInterests.map((n) => ({ topic: n.topic, weight: n.weight }));

      // Learning style heuristic: longer, more textual queries → reading;
      // shorter "show me" → visual; "how do I" → kinesthetic.
      let learningStyle: CirkleDNA["learningStyle"] = "reading";
      if (queries.length > 0) {
        const avgLen = queries.reduce((s, q) => s + q.split(/\s+/).length, 0) / queries.length;
        const showCues = queries.filter((q) => /show|picture|image|diagram/i.test(q)).length;
        const howCues = queries.filter((q) => /how do i|how to|step|practice/i.test(q)).length;
        if (showCues / queries.length > 0.3) learningStyle = "visual";
        else if (howCues / queries.length > 0.3) learningStyle = "kinesthetic";
        else if (avgLen < 5) learningStyle = "auditory";
      }

      const dna: CirkleDNA = {
        bigFive,
        values,
        communicationStyle,
        interests,
        learningStyle,
        updatedAt: new Date().toISOString(),
      };
      await savePreference(DNA_KEY, dna);
      return dna;
    } catch {
      return defaultDNA();
    }
  }

  /** Read the most recently-built DNA from IndexedDB. */
  async getDNA(): Promise<CirkleDNA | null> {
    try {
      await openBrainDB();
      const dna = await getPreference<CirkleDNA>(DNA_KEY);
      return dna ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Returns true if the DNA is stale (older than a week) or absent.
   * Used by the hook to decide whether to trigger a background rebuild.
   */
  async isDNAStale(): Promise<boolean> {
    const dna = await this.getDNA();
    if (!dna) return true;
    const updated = new Date(dna.updatedAt).getTime();
    return Date.now() - updated > DNA_REBUILD_INTERVAL_MS;
  }

  // ── Mood ──────────────────────────────────────────────────────────────

  /**
   * Detect the user's current mood from recent signals. Each signal is
   * optional; missing signals are simply not factored in.
   *
   * Heuristic-only — works offline. The result is persisted so other
   * features can read it via `getMood()`.
   */
  async detectMood(signals: MoodSignals): Promise<CirkleMood> {
    const collected: { source: string; value: number }[] = [];
    let energy = 50; // start at neutral
    let valence = 0; // start at neutral

    // typing_speed (chars/sec): faster → higher energy
    if (typeof signals.typing_speed === "number") {
      const norm = clamp(signals.typing_speed / 8, 0, 1); // 8 cps ≈ very fast
      energy = energy * 0.6 + norm * 100 * 0.4;
      collected.push({ source: "typing_speed", value: norm });
    }
    // session_duration (ms): long sessions drain energy slightly
    if (typeof signals.session_duration === "number") {
      const mins = signals.session_duration / 60000;
      const drain = clamp(mins / 60, 0, 1); // 60 min = full drain
      energy = energy * 0.85 + (100 - drain * 40) * 0.15;
      collected.push({ source: "session_duration", value: drain });
    }
    // content_sentiment (-1..1): direct valence contribution
    if (typeof signals.content_sentiment === "number") {
      valence = signals.content_sentiment * 100;
      collected.push({ source: "content_sentiment", value: signals.content_sentiment });
    }
    // time_of_day (0..23): morning = +energy, late night = -energy
    if (typeof signals.time_of_day === "number") {
      const h = signals.time_of_day;
      let timeBoost = 0;
      if (h >= 7 && h <= 11) timeBoost = 20; // morning peak
      else if (h >= 12 && h <= 16) timeBoost = 10; // afternoon
      else if (h >= 17 && h <= 21) timeBoost = 5; // evening
      else timeBoost = -15; // late night
      energy = clamp(energy + timeBoost * 0.3, 0, 100);
      collected.push({ source: "time_of_day", value: h });
    }

    // Decide the current mood bucket from (energy, valence)
    let current: CirkleMood["current"] = "neutral";
    if (valence > 30 && energy > 65) current = "joyful";
    else if (valence > 30 && energy <= 65) current = "calm";
    else if (valence > 50 && energy > 80) current = "excited";
    else if (energy > 70 && valence >= -10 && valence <= 30) current = "focused";
    else if (energy < 30 && valence >= -20) current = "tired";
    else if (valence < -20) current = "stressed";

    const mood: CirkleMood = {
      current,
      energy: Math.round(energy),
      valence: Math.round(valence),
      confidence: clamp(collected.length / 4, 0.2, 1),
      detectedAt: new Date().toISOString(),
      signals: collected,
    };
    try {
      await openBrainDB();
      await savePreference(MOOD_KEY, mood);
    } catch {
      // best-effort
    }
    return mood;
  }

  /** Read the most recently-detected mood from IndexedDB. */
  async getMood(): Promise<CirkleMood | null> {
    try {
      await openBrainDB();
      const mood = await getPreference<CirkleMood>(MOOD_KEY);
      return mood ?? null;
    } catch {
      return null;
    }
  }

  // ── Topic DNA ─────────────────────────────────────────────────────────

  /** Update a topic's weight by `weightDelta` and refresh its trend. */
  async updateTopicDNA(topic: string, weightDelta: number): Promise<void> {
    if (!topic) return;
    try {
      await openBrainDB();
      // The Brain's interest graph is the source of truth for weights —
      // we update it first, then mirror to Topic DNA for trend metadata.
      await updateInterest(topic, "user", weightDelta);
      const now = Date.now();
      const existing = await this.getTopicDNA();
      const prior = existing.find((t) => t.topic === topic);
      const node: TopicDNA = {
        topic,
        weight: clamp((prior?.weight ?? 0) + weightDelta, 0, 100),
        trend: computeTrend(now, now, (prior?.weight ?? 0) + weightDelta),
        firstSeen: prior?.firstSeen ?? new Date(now).toISOString(),
        lastSeen: new Date(now).toISOString(),
        relatedTopics: prior?.relatedTopics ?? [],
      };
      const next = [node, ...existing.filter((t) => t.topic !== topic)];
      await savePreference(TOPIC_DNA_KEY, next);
    } catch {
      // best-effort
    }
  }

  /** Return all known Topic DNA entries, sorted by weight descending. */
  async getTopicDNA(): Promise<TopicDNA[]> {
    try {
      await openBrainDB();
      const list = (await getPreference<TopicDNA[]>(TOPIC_DNA_KEY)) ?? [];
      const now = Date.now();
      // Refresh trends based on lastSeen relative to "now"
      return list
        .map((t) => ({
          ...t,
          trend: computeTrend(now, new Date(t.lastSeen).getTime(), t.weight),
        }))
        .sort((a, b) => b.weight - a.weight);
    } catch {
      return [];
    }
  }

  /**
   * Build the initial Topic DNA list from the Brain's existing interest
   * graph (used the first time the user opens the Personal AI OS).
   */
  async seedTopicDNAFromInterests(): Promise<TopicDNA[]> {
    try {
      await openBrainDB();
      const interests = await getTopInterests(50);
      const now = Date.now();
      const list: TopicDNA[] = interests.map((n: InterestNode) => ({
        topic: n.topic,
        weight: n.weight,
        trend: computeTrend(now, n.lastInteracted, n.weight),
        firstSeen: new Date(n.lastInteracted).toISOString(),
        lastSeen: new Date(n.lastInteracted).toISOString(),
        relatedTopics: [],
      }));
      await savePreference(TOPIC_DNA_KEY, list);
      return list;
    } catch {
      return [];
    }
  }

  // ── Unified profile ───────────────────────────────────────────────────

  /**
   * Returns the full unified profile (DNA + Mood + Topics + Interests)
   * in a single call. Designed for other features to consume as a
   * one-shot context.
   */
  async getUnifiedProfile(): Promise<UnifiedProfile> {
    const [dna, mood, topics] = await Promise.all([
      this.getDNA(),
      this.getMood(),
      this.getTopicDNA(),
    ]);
    const interests = (topics ?? []).map((t) => t.topic);
    return { dna, mood, topics: topics ?? [], interests };
  }

  // ── Personalization context ───────────────────────────────────────────

  /**
   * Generate a human-readable personalization context string suitable
   * for injection into an LLM system prompt. Returns a minimal context
   * if the user has not granted consent.
   *
   * Example output (full):
   *   "User personality: high openness, diplomatic communicator. Current
   *    mood: focused, high energy. Top interests: AI, travel, photography.
   *    Adjust tone to be thoughtful and visual."
   */
  async getPersonalizationContext(): Promise<string> {
    const consent = await getPersonalAIConsent();
    const { dna, mood, topics } = await this.getUnifiedProfile();

    if (!consent) {
      // Minimal context — only communication style + top interest, no
      // personality scores or mood state.
      const style = dna?.communicationStyle ?? "diplomatic";
      const top = topics[0]?.topic;
      return [
        `Communication style: ${style}.`,
        top ? `Primary interest: ${top}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
    }

    const parts: string[] = [];
    if (dna) {
      const bf = dna.bigFive;
      const high = Object.entries(bf)
        .filter(([, v]) => v >= 65)
        .map(([k]) => k);
      const low = Object.entries(bf)
        .filter(([, v]) => v <= 35)
        .map(([k]) => k);
      const personalityBits: string[] = [];
      if (high.length) personalityBits.push(`high ${high.join(", ")}`);
      if (low.length) personalityBits.push(`low ${low.join(", ")}`);
      parts.push(
        `User personality: ${personalityBits.join("; ") || "balanced"}.`,
      );
      parts.push(`Communication style: ${dna.communicationStyle}.`);
      parts.push(`Learning style: ${dna.learningStyle}.`);
      if (dna.values.length > 0) parts.push(`Values: ${dna.values.join(", ")}.`);
    }
    if (mood) {
      parts.push(
        `Current mood: ${mood.current} (energy ${mood.energy}/100, valence ${mood.valence}).`,
      );
    }
    if (topics.length > 0) {
      const top5 = topics.slice(0, 5).map((t) => t.topic).join(", ");
      parts.push(`Top interests: ${top5}.`);
    }
    // Tone suggestion based on mood + DNA
    const tone = this.suggestedTone(dna, mood);
    if (tone) parts.push(`Adjust tone to be ${tone}.`);
    return parts.join(" ");
  }

  private suggestedTone(
    dna: CirkleDNA | null,
    mood: CirkleMood | null,
  ): string | null {
    if (!dna && !mood) return null;
    const bits: string[] = [];
    if (mood) {
      if (mood.current === "tired") bits.push("gentle");
      else if (mood.current === "stressed") bits.push("calm and reassuring");
      else if (mood.current === "focused") bits.push("concise");
      else if (mood.current === "excited") bits.push("enthusiastic");
    }
    if (dna) {
      if (dna.learningStyle === "visual") bits.push("visual");
      else if (dna.learningStyle === "kinesthetic") bits.push("action-oriented");
      if (dna.communicationStyle === "formal") bits.push("formal");
      else if (dna.communicationStyle === "playful") bits.push("playful");
    }
    return bits.length > 0 ? bits.slice(0, 3).join(" and ") : null;
  }

  // ── Memory recall ─────────────────────────────────────────────────────

  /**
   * Recall relevant past interactions by simple keyword match against
   * the user's on-device history. Returns up to `limit` (default 5)
   * response strings, most-recent first.
   *
   * This is a deliberately lightweight lexical recall — no embeddings,
   * no server call. The Brain Memory store is the canonical source.
   */
  async recall(query: string, limit = 5): Promise<string[]> {
    try {
      await openBrainDB();
      const all = await getRecentInteractions(500);
      if (!query) {
        return all.slice(0, limit).map((i) => i.response);
      }
      const tokens = query
        .toLowerCase()
        .split(/\W+/)
        .filter((t) => t.length > 2);
      const scored = all
        .map((i) => {
          const text = (i.query + " " + i.response).toLowerCase();
          let score = 0;
          for (const t of tokens) {
            if (text.includes(t)) score += 1;
          }
          return { i, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || b.i.timestamp - a.i.timestamp);
      return scored.slice(0, limit).map((s) => s.i.response);
    } catch {
      return [];
    }
  }

  /** Return recent interactions (raw) for the Memory tab UI. */
  async recentInteractions(limit = 25): Promise<BrainInteraction[]> {
    try {
      await openBrainDB();
      return await getRecentInteractions(limit);
    } catch {
      return [];
    }
  }

  // ── Group Memory (mock — shared across circles) ───────────────────────

  async getGroupMemory(circleId: string): Promise<GroupMemoryItem[]> {
    try {
      await openBrainDB();
      const all = (await getPreference<GroupMemoryItem[]>(GROUP_MEM_KEY)) ?? [];
      return all.filter((m) => m.circleId === circleId);
    } catch {
      return [];
    }
  }

  async addToGroupMemory(
    circleId: string,
    item: Omit<GroupMemoryItem, "id" | "circleId" | "createdAt">,
  ): Promise<void> {
    try {
      await openBrainDB();
      const all = (await getPreference<GroupMemoryItem[]>(GROUP_MEM_KEY)) ?? [];
      const entry: GroupMemoryItem = {
        id: `gm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        circleId,
        createdAt: new Date().toISOString(),
        ...item,
      };
      all.unshift(entry);
      await savePreference(GROUP_MEM_KEY, all.slice(0, 200));
    } catch {
      // best-effort
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────────

export const personalAI = new PersonalAI();
