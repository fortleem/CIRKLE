/**
 * Mood-Based Feed Adaptation — Task CREATIVE-2, Feature #3.
 *
 * Passively detects the user's current mood from observable signals
 * (time of day, recent activity, weather) and returns a feed config
 * + a subtle UI accent recommendation. No explicit user input — the
 * detection is fully passive.
 *
 * This file is pure (no React, no DB) so it can be imported from both
 * server routes and client components.
 */

// ── Types ────────────────────────────────────────────────────────────────

export type Mood =
  | "energetic"
  | "relaxed"
  | "social"
  | "focused"
  | "bored";

export type ModuleId = "midan" | "lamahat" | "mashahd" | "wasl";

export interface MoodSignal {
  /** Hour of day 0-23 (local). */
  timeOfDay: number;
  /** Minutes since last user interaction. 0 = right now. */
  minutesSinceLastActive: number;
  /** Messages sent in Wasl in the last hour. */
  messagingActivity: number;
  /** Number of long-form posts (>= 500 chars) the user has fully read in the last 30 min. */
  longFormReadCount: number;
  /** Average scroll velocity (px/sec) in the last 60 seconds. */
  avgScrollVelocity: number;
  /** Engagement actions (likes/comments) in the last 15 minutes. */
  recentEngagement: number;
  /** Optional weather summary — affects "relaxed" detection. */
  weather?: "sunny" | "cloudy" | "rainy" | "clear-night" | "unknown";
}

export interface FeedBucket {
  module: ModuleId;
  /** Relative weight 0..1 — sum of weights within a feed config = 1.0. */
  weight: number;
  /** Content sub-filter the feed algorithm should apply. */
  filter: string;
}

export interface MoodFeedConfig {
  mood: Mood;
  /** Human-readable headline shown above the feed. */
  headline: string;
  /** Sub-text explaining the feed mix (bilingual). */
  caption: string;
  /** Module buckets + weights. */
  buckets: FeedBucket[];
  /** Whether to prefer shorter content items. */
  preferShortForm: boolean;
  /** Whether to surface trending content. */
  boostTrending: boolean;
  /** Whether to surface discover/new content. */
  boostDiscover: boolean;
}

export interface MoodTheme {
  mood: Mood;
  /** Accent color label the UI should use. */
  accent: "gold-bright" | "teal-soft" | "rose-warm" | "charcoal-deep" | "gold-warm";
  /** Tailwind-friendly hex token (used by inline styles / CSS vars). */
  hex: string;
  /** Subtle gradient classes for glass surfaces. */
  gradient: string;
  /** Optional emoji for the mood chip. */
  emoji: string;
}

export interface MoodResponse {
  mood: Mood;
  feed: MoodFeedConfig;
  theme: MoodTheme;
  /** Server timestamp (ISO). */
  at: string;
  /** Confidence 0..1 of the mood detection. */
  confidence: number;
}

// ── Mood detection ───────────────────────────────────────────────────────
//
// Pure heuristic — no external AI call. Each mood is a scored candidate;
// the highest-scoring candidate wins. Ties are broken by the order in
// the CANDIDATES array (energetic > relaxed > social > focused > bored).

interface ScoredMood {
  mood: Mood;
  score: number;
  confidence: number;
}

const CANDIDATES: Mood[] = ["energetic", "relaxed", "social", "focused", "bored"];

function scoreMood(mood: Mood, s: MoodSignal): number {
  switch (mood) {
    case "energetic": {
      // Morning (5-11) + active (recent engagement, low idle).
      let score = 0;
      if (s.timeOfDay >= 5 && s.timeOfDay < 12) score += 2;
      else if (s.timeOfDay >= 12 && s.timeOfDay < 17) score += 1;
      else score -= 1;
      if (s.minutesSinceLastActive <= 2) score += 1.5;
      else if (s.minutesSinceLastActive <= 10) score += 0.5;
      else score -= 0.5;
      if (s.recentEngagement >= 4) score += 1.5;
      else if (s.recentEngagement >= 1) score += 0.5;
      if (s.avgScrollVelocity > 300) score -= 0.5; // frantic != energetic
      if (s.weather === "sunny") score += 0.5;
      return score;
    }
    case "relaxed": {
      // Evening (17+) OR rainy + passive scrolling + low engagement.
      let score = 0;
      if (s.timeOfDay >= 17 || s.timeOfDay < 5) score += 1.5;
      if (s.weather === "rainy" || s.weather === "cloudy") score += 1;
      if (s.avgScrollVelocity > 60 && s.avgScrollVelocity < 250) score += 1;
      if (s.recentEngagement <= 1) score += 0.5;
      if (s.messagingActivity <= 2) score += 0.5;
      if (s.longFormReadCount >= 1) score -= 0.5; // reading long-form = focused, not relaxed
      return score;
    }
    case "social": {
      // High messaging activity + interactive.
      let score = 0;
      if (s.messagingActivity >= 8) score += 2.5;
      else if (s.messagingActivity >= 4) score += 1.5;
      else if (s.messagingActivity >= 1) score += 0.5;
      if (s.recentEngagement >= 2) score += 1;
      if (s.minutesSinceLastActive <= 1) score += 0.5;
      if (s.weather === "sunny") score += 0.3;
      return score;
    }
    case "focused": {
      // Long-form reads + low scroll velocity.
      let score = 0;
      if (s.longFormReadCount >= 2) score += 2.5;
      else if (s.longFormReadCount >= 1) score += 1.5;
      if (s.avgScrollVelocity < 60) score += 1.5;
      if (s.minutesSinceLastActive <= 1) score += 0.5;
      if (s.recentEngagement <= 2) score += 0.3;
      return score;
    }
    case "bored": {
      // Rapid scrolling + low engagement + low messaging.
      let score = 0;
      if (s.avgScrollVelocity >= 350) score += 2;
      else if (s.avgScrollVelocity >= 250) score += 1;
      if (s.recentEngagement === 0) score += 1.5;
      if (s.messagingActivity === 0) score += 0.5;
      if (s.minutesSinceLastActive <= 1) score += 0.5; // they're using the app
      if (s.longFormReadCount >= 1) score -= 1; // not bored if reading
      return score;
    }
    default:
      return 0;
  }
}

/**
 * Detects the most likely mood from the given signals. Returns the mood
 * plus a confidence score (0..1).
 *
 * Confidence is computed as the winner's margin over the runner-up,
 * normalized to a 0..1 range — a wide margin = high confidence.
 */
export function detectMood(signal: MoodSignal): { mood: Mood; confidence: number } {
  const scored: ScoredMood[] = CANDIDATES.map((mood) => ({
    mood,
    score: scoreMood(mood, signal),
    confidence: 0,
  }));
  scored.sort((a, b) => b.score - a.score);

  const winner = scored[0]!;
  const runnerUp = scored[1] ?? scored[0]!;
  const margin = Math.max(0, winner.score - runnerUp.score);
  // Map a 0..3 margin onto 0.5..1.0 confidence — even a perfect tie yields
  // 0.5 confidence, since the winner was chosen by deterministic order.
  const confidence = Math.max(0.5, Math.min(1, 0.5 + margin / 6));

  return { mood: winner.mood, confidence };
}

// ── Feed configs ─────────────────────────────────────────────────────────

export function getMoodFeed(mood: Mood): MoodFeedConfig {
  switch (mood) {
    case "energetic":
      return {
        mood,
        headline: "Quick energy hits",
        caption: "Short videos + active discussions to match your momentum.",
        buckets: [
          { module: "mashahd", weight: 0.45, filter: "short-form,active" },
          { module: "midan",   weight: 0.30, filter: "hot,active-discussions" },
          { module: "lamahat", weight: 0.15, filter: "vibrant" },
          { module: "wasl",    weight: 0.10, filter: "active-chats" },
        ],
        preferShortForm: true,
        boostTrending: true,
        boostDiscover: false,
      };
    case "relaxed":
      return {
        mood,
        headline: "Slow moments",
        caption: "Photos, calming content, and music for unwinding.",
        buckets: [
          { module: "lamahat", weight: 0.40, filter: "calming,scenic" },
          { module: "mashahd", weight: 0.25, filter: "ambient,music" },
          { module: "midan",   weight: 0.20, filter: "soft,low-noise" },
          { module: "wasl",    weight: 0.15, filter: "low-priority" },
        ],
        preferShortForm: false,
        boostTrending: false,
        boostDiscover: false,
      };
    case "social":
      return {
        mood,
        headline: "Friends & circles first",
        caption: "Friend posts + circle activity to stay connected.",
        buckets: [
          { module: "midan",   weight: 0.35, filter: "friends-only" },
          { module: "wasl",    weight: 0.30, filter: "active-chats,priority" },
          { module: "lamahat", weight: 0.20, filter: "friends" },
          { module: "mashahd", weight: 0.15, filter: "friends" },
        ],
        preferShortForm: false,
        boostTrending: false,
        boostDiscover: false,
      };
    case "focused":
      return {
        mood,
        headline: "Long reads & deep dives",
        caption: "Long-form posts, news, and educational content.",
        buckets: [
          { module: "midan",   weight: 0.50, filter: "long-form,educational" },
          { module: "wasl",    weight: 0.20, filter: "news,curated" },
          { module: "lamahat", weight: 0.15, filter: "editorial" },
          { module: "mashahd", weight: 0.15, filter: "long-form,talks" },
        ],
        preferShortForm: false,
        boostTrending: false,
        boostDiscover: false,
      };
    case "bored":
      return {
        mood,
        headline: "Something new",
        caption: "Trending + discover + fresh creators to break the scroll.",
        buckets: [
          { module: "mashahd", weight: 0.35, filter: "trending,new" },
          { module: "midan",   weight: 0.30, filter: "trending,discover" },
          { module: "lamahat", weight: 0.20, filter: "discover" },
          { module: "wasl",    weight: 0.15, filter: "discover" },
        ],
        preferShortForm: true,
        boostTrending: true,
        boostDiscover: true,
      };
    default:
      return getMoodFeed("relaxed");
  }
}

// ── Theme suggestions ────────────────────────────────────────────────────

export function getMoodTheme(mood: Mood): MoodTheme {
  switch (mood) {
    case "energetic":
      return {
        mood,
        accent: "gold-bright",
        hex: "#f5b324",
        gradient: "from-amber-300/20 via-amber-200/10 to-transparent",
        emoji: "⚡",
      };
    case "relaxed":
      return {
        mood,
        accent: "teal-soft",
        hex: "#5b9aa0",
        gradient: "from-teal-400/15 via-teal-300/8 to-transparent",
        emoji: "🌙",
      };
    case "social":
      return {
        mood,
        accent: "rose-warm",
        hex: "#d98a8a",
        gradient: "from-rose-300/18 via-rose-200/8 to-transparent",
        emoji: "💛",
      };
    case "focused":
      return {
        mood,
        accent: "charcoal-deep",
        hex: "#2f3437",
        gradient: "from-slate-500/15 via-slate-400/8 to-transparent",
        emoji: "🎯",
      };
    case "bored":
      return {
        mood,
        accent: "gold-warm",
        hex: "#e8a14a",
        gradient: "from-orange-300/15 via-amber-200/8 to-transparent",
        emoji: "✨",
      };
    default:
      return getMoodTheme("relaxed");
  }
}

// ── Top-level convenience ─────────────────────────────────────────────────

/**
 * Builds the full /api/mood response payload from a signal snapshot.
 * Defaults the signal to "right now" if not provided.
 */
export function buildMoodResponse(signal: MoodSignal, at = new Date()): MoodResponse {
  const { mood, confidence } = detectMood(signal);
  return {
    mood,
    feed: getMoodFeed(mood),
    theme: getMoodTheme(mood),
    at: at.toISOString(),
    confidence,
  };
}

/**
 * A best-effort default signal derived purely from the current time.
 * Used when the client has not yet sent any activity telemetry — we still
 * want to return a sensible mood rather than throwing.
 */
export function defaultSignalForNow(date = new Date()): MoodSignal {
  const hour = date.getHours();
  // Reasonable defaults: just-opened the app, no messages yet, normal scroll.
  return {
    timeOfDay: hour,
    minutesSinceLastActive: 0,
    messagingActivity: 0,
    longFormReadCount: 0,
    avgScrollVelocity: 120,
    recentEngagement: 0,
    weather: "unknown",
  };
}
