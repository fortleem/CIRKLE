/**
 * Social Challenges — Task CREATIVE-2, Feature #4.
 *
 * Weekly community challenges to boost engagement across all CIRKLE modules.
 * Five challenges per week, one per module (Wasl, Midan, Lamahat, Mashahd,
 * Rihla). Challenges rotate weekly (deterministic per ISO week), with
 * participation + completion tracked in localStorage.
 *
 * This file is pure (no React, no DB) — consumed by:
 *   • `GET /api/challenges`           — this week's challenges + user progress
 *   • `POST /api/challenges/record`   — record participation/completion
 *   • Any UI that wants to surface the weekly challenge set
 */

import type { ModuleId } from "@/lib/cross-module-share";

// ── Types ────────────────────────────────────────────────────────────────

/** All CIRKLE modules — including Rihla which is travel-specific. */
export type ChallengeModule = ModuleId | "rihla";

export type ChallengeType = "photo" | "text" | "video" | "message" | "plan";

export interface Challenge {
  /** Stable ID (used as the localStorage key for participation). */
  id: string;
  /** Module the challenge belongs to. */
  module: ChallengeModule;
  /** Challenge type — drives the call-to-action icon. */
  type: ChallengeType;
  /** English title. */
  en: string;
  /** Arabic title. */
  ar: string;
  /** English hint / instructions. */
  hintEn: string;
  /** Arabic hint / instructions. */
  hintAr: string;
  /** Emoji shown in the UI. */
  emoji: string;
  /** Approximate minutes to complete. */
  estimatedMinutes: number;
}

export interface ChallengeProgress {
  /** Challenge ID. */
  challengeId: string;
  /** Whether the user has started (clicked "I'll do this"). */
  started: boolean;
  /** Whether the user marked the challenge as complete. */
  completed: boolean;
  /** ISO timestamp of when the user started. */
  startedAt: string | null;
  /** ISO timestamp of when the user completed. */
  completedAt: string | null;
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  /** Display name. */
  name: string;
  /** Username (without @). */
  username: string;
  /** Number of challenges completed this week (0-5). */
  completed: number;
  /** Whether this is the current user. */
  isMe?: boolean;
}

export interface ChallengeBadge {
  id: string;
  label: string;
  description: string;
  emoji: string;
  /** True if the user has earned the badge. */
  earned: boolean;
}

export interface ChallengeResponse {
  /** ISO week key — `YYYY-Www` (e.g. "2025-W03"). */
  weekKey: string;
  /** Week start (Monday) ISO date. */
  weekStart: string;
  /** Week end (Sunday) ISO date. */
  weekEnd: string;
  /** This week's five challenges (one per module). */
  challenges: Challenge[];
  /** Per-challenge progress (hydrated from localStorage by the client). */
  progress: Record<string, ChallengeProgress>;
  /** Number of challenges completed this week. */
  completedCount: number;
  /** Whether the user has earned the Weekly Champion badge (4/5+ completed). */
  champion: boolean;
  /** Badges available this week. */
  badges: ChallengeBadge[];
  /** Leaderboard — top participants this week (mock). */
  leaderboard: ChallengeLeaderboardEntry[];
  /** Current user's leaderboard rank (1-based, null if unranked). */
  myRank: number | null;
  /** Server timestamp (ISO). */
  at: string;
}

// ── Challenge library ─────────────────────────────────────────────────────
//
// We provide 5 distinct challenges per module (25 total). Each week picks
// one challenge per module, indexed by `weekOfYear % pool.length`, so
// within a 5-week window the same challenge never repeats.

export const CHALLENGE_LIBRARY: Record<ChallengeModule, Challenge[]> = {
  wasl: [
    {
      id: "wasl-reconnect", module: "wasl", type: "message", emoji: "💬",
      en: "Send a message to someone you haven't talked to in a while",
      ar: "ابعت رسالة لحد ماتكلوش معاه من فترة",
      hintEn: "Open Wasl → search a contact you haven't messaged in 30+ days → send anything.",
      hintAr: "افتح Wasl → دور على حد ماتكلتش معاه من 30 يوم → ابعت أي حاجة.",
      estimatedMinutes: 3,
    },
    {
      id: "wasl-voice-note", module: "wasl", type: "message", emoji: "🎙️",
      en: "Send a 30-second voice note to a friend",
      ar: "ابعت مذكرة صوتية 30 ثانية لصاحب",
      hintEn: "Voice notes carry more warmth than text. Surprise someone today.",
      hintAr: "المذكرة الصوتية فيها دفء أكتر من النص. فاجأ حد النهارده.",
      estimatedMinutes: 2,
    },
    {
      id: "wasl-group-checkin", module: "wasl", type: "message", emoji: "👥",
      en: "Post a check-in message to a circle you've been quiet in",
      ar: "ابعت رسالة في سيكل كنت ساكت فيه",
      hintEn: "Pick a circle you haven't posted in for 2 weeks → say hi.",
      hintAr: "اختار سيكل مدخنتش فيه من أسبوعين → سلم.",
      estimatedMinutes: 2,
    },
    {
      id: "wasl-compliment", module: "wasl", type: "message", emoji: "💛",
      en: "Send an unexpected compliment to someone",
      ar: "ابعت مدح غير متوقع لحد",
      hintEn: "Bonus points if it's about something they did weeks ago — proves you noticed.",
      hintAr: "لو كان عن حاجة عملها من أسابيع أحسن — بيوضح إنك منتبه.",
      estimatedMinutes: 3,
    },
    {
      id: "wasl-share-link", module: "wasl", type: "message", emoji: "🔗",
      en: "Share a useful link with a friend who'd appreciate it",
      ar: "شارك لينك مفيد مع صاحب هيعرف قيمته",
      hintEn: "Think of one person + one link that fits their interests right now.",
      hintAr: "فكر في شخص واحد + لينك واحد يناسب اهتماماته دلوقتي.",
      estimatedMinutes: 2,
    },
  ],
  midan: [
    {
      id: "midan-280-story", module: "midan", type: "text", emoji: "✍️",
      en: "Write a 280-character story",
      ar: "اكتب قصة في 280 حرف",
      hintEn: "One setting, one conflict, one resolution. Tight prose beats long rambles.",
      hintAr: "مكان واحد، صراع واحد، حل واحد. الكتابة المضغوطة أحسن من التطويل.",
      estimatedMinutes: 10,
    },
    {
      id: "midan-hot-take", module: "midan", type: "text", emoji: "🔥",
      en: "Share a respectful hot take on a topic you care about",
      ar: "شارك رأي صريح ومحترم في موضوع يهمك",
      hintEn: "Back it with one reason + one example. Avoid ad hominem.",
      hintAr: "ادعمه بسبب واحد + مثال واحد. تجنب الهجوم الشخصي.",
      estimatedMinutes: 8,
    },
    {
      id: "midan-throwback", module: "midan", type: "text", emoji: "🕰️",
      en: "Post a throwback memory from exactly one year ago",
      ar: "انشر ذكريات من سنة بالظبط",
      hintEn: "Photo, song, or story — anything that captures where you were a year ago.",
      hintAr: "صورة، أغنية، أو قصة — أي حاجة بتلخص مكانك سنة فاتت.",
      estimatedMinutes: 5,
    },
    {
      id: "midan-question", module: "midan", type: "text", emoji: "❓",
      en: "Ask the community a genuine question",
      ar: "اسأل المجتمع سؤال حقيقي",
      hintEn: "Open-ended questions get the richest answers — avoid yes/no.",
      hintAr: "الأسئلة المفتوحة بتجيب أحسن إجابات — بلاش نعم/لا.",
      estimatedMinutes: 3,
    },
    {
      id: "midan-gratitude-post", module: "midan", type: "text", emoji: "🙏",
      en: "Publicly thank someone who helped you recently",
      ar: "اشكر حد علنًا ساعدك مؤخرًا",
      hintEn: "Tag them. Specific gratitude > generic praise.",
      hintAr: "اعمل لهم تاج. الشكر المحدد أحسن من المديح العام.",
      estimatedMinutes: 4,
    },
  ],
  lamahat: [
    {
      id: "lamahat-morning-coffee", module: "lamahat", type: "photo", emoji: "☕",
      en: "Share a photo of your morning coffee",
      ar: "شارك صورة قهوة الصبح",
      hintEn: "Lighting matters — try a window seat, natural light, no flash.",
      hintAr: "الإضاءة مهمة — حاول تفضل عند الشباك، إضاءة طبيعية، من غير فلاش.",
      estimatedMinutes: 3,
    },
    {
      id: "lamahat-sky", module: "lamahat", type: "photo", emoji: "🌤️",
      en: "Photograph today's sky",
      ar: "صور سماء النهارده",
      hintEn: "Same spot, different day = a beautiful time series over weeks.",
      hintAr: "نفس المكان، يوم مختلف = سلسلة وقت حلوة عبر الأسابيع.",
      estimatedMinutes: 2,
    },
    {
      id: "lamahat-detail", module: "lamahat", type: "photo", emoji: "🔍",
      en: "Capture a small detail others would miss",
      ar: "صور تفصيلة صغيرة حد تاني ممكن يفوتها",
      hintEn: "Texture, shadow, pattern — the world at 30cm is full of beauty.",
      hintAr: "ملمس، ظل، نقش — العالم على بعد 30 سم مليان جمال.",
      estimatedMinutes: 5,
    },
    {
      id: "lamahat-color", module: "lamahat", type: "photo", emoji: "🎨",
      en: "Post a photo dominated by a single color",
      ar: "انشر صورة يغلب عليها لون واحد",
      hintEn: "Pick a color → find 3 things in that color → photograph the best one.",
      hintAr: "اختار لون → دور على 3 حاجات بنفس اللون → صور أحسن واحدة.",
      estimatedMinutes: 6,
    },
    {
      id: "lamahat-meal", module: "lamahat", type: "photo", emoji: "🍽️",
      en: "Share a photo of a meal you cooked or discovered",
      ar: "شارك صورة أكلة طبختها أو اكتشفتها",
      hintEn: "Shoot from above, fill the frame, let the food tell its story.",
      hintAr: "صور من فوق، املأ الإطار، خلّي الأكلة تحكي قصتها.",
      estimatedMinutes: 4,
    },
  ],
  mashahd: [
    {
      id: "mashahd-city-30s", module: "mashahd", type: "video", emoji: "🏙️",
      en: "Share a 30-second video about your city",
      ar: "شارك فيديو 30 ثانية عن مدينتك",
      hintEn: "Three 10-second clips: a street, a person, a sound. Cuts > narration.",
      hintAr: "ثلاث مقاطع 10 ثوانٍ: شارع، شخص، صوت. القطع أحسن من التعليق.",
      estimatedMinutes: 12,
    },
    {
      id: "mashahd-skill", module: "mashahd", type: "video", emoji: "🎯",
      en: "Teach a skill in under 60 seconds",
      ar: "علّم مهارة في أقل من 60 ثانية",
      hintEn: "One skill, one outcome, one demo. Tight editing wins.",
      hintAr: "مهارة واحدة، نتيجة واحدة، عرض واحد. المونتاج المضغوط بيكسب.",
      estimatedMinutes: 15,
    },
    {
      id: "mashahd-moment", module: "mashahd", type: "video", emoji: "✨",
      en: "Capture an unexpected moment on video",
      ar: "سجّل لحظة غير متوقعة بالفيديو",
      hintEn: "Always be recording when something feels 'off' — that's the moment.",
      hintAr: "سجّل دايمًا لما تحس إن الحاجة «غريبة» — دي اللحظة.",
      estimatedMinutes: 8,
    },
    {
      id: "mashahd-song-rec", module: "mashahd", type: "video", emoji: "🎵",
      en: "Record yourself humming a song that's stuck in your head",
      ar: "سجّل نفسك تدندن أغنية عالقة في راسك",
      hintEn: "Bonus: tag 3 friends to do the same. Song-chain > solo.",
      hintAr: "لو عملت تاج لـ 3 أصحاب يعملوا نفس الحاجة. سلسلة أحسن من فردي.",
      estimatedMinutes: 3,
    },
    {
      id: "mashahd-walk", module: "mashahd", type: "video", emoji: "🚶",
      en: "Film a 20-second walking-tour clip of your neighborhood",
      ar: "صوّر 20 ثانية جولة سير في حارتك",
      hintEn: "Steady hand, no zoom. Let the streets introduce themselves.",
      hintAr: "إيد ثابتة، من غير زووم. خلّي الشوارع تعرف نفسها.",
      estimatedMinutes: 7,
    },
  ],
  rihla: [
    {
      id: "rihla-day-trip", module: "rihla", type: "plan", emoji: "🚗",
      en: "Plan a day trip and share it",
      ar: "خطّط رحلة يومية وشاركها",
      hintEn: "Pick a place within 2h → itinerary with 3 stops → share on Rihla.",
      hintAr: "اختار مكان في حدود ساعتين → برنامج 3 محطات → شارك في Rihla.",
      estimatedMinutes: 10,
    },
    {
      id: "rihla-hidden-gem", module: "rihla", type: "plan", emoji: "💎",
      en: "Recommend a hidden gem in your region",
      ar: "اصف جوهرة مخفية في منطقتك",
      hintEn: "Why is it special? One sentence. The story > the GPS pin.",
      hintAr: "ليه مميزة؟ جملة واحدة. القصة أحسن من الإحداثيات.",
      estimatedMinutes: 5,
    },
    {
      id: "rihla-budget", module: "rihla", type: "plan", emoji: "💰",
      en: "Share a one-day travel itinerary under $20",
      ar: "شارك برنامج رحلة يوم بأقل من 20 دولار",
      hintEn: "Budget travel forces creativity — show us yours.",
      hintAr: "السفر بالميزانية بيخليك مبدع — ورينا بتاعك.",
      estimatedMinutes: 8,
    },
    {
      id: "rihla-local-food", module: "rihla", type: "plan", emoji: "🍲",
      en: "Map out the best 3 food stops in your city",
      ar: "ارسم خريطة أحسن 3 محطات أكل في مدينتك",
      hintEn: "Locals-only spots > tourist traps. Photos = bonus.",
      hintAr: "أماكن أهل البلد أحسن من الكرفان السياحي. الصور = بونص.",
      estimatedMinutes: 7,
    },
    {
      id: "rihla-future", module: "rihla", type: "plan", emoji: "🗺️",
      en: "Post your dream trip itinerary (realistic budget)",
      ar: "انشر برنامج رحلة أحلامك (بميزانية واقعية)",
      hintEn: "Pick a place you've never been → 5-day plan → real flight prices.",
      hintAr: "اختار مكان مروحتشوش → برنامج 5 أيام → أسعار طيران حقيقية.",
      estimatedMinutes: 12,
    },
  ],
};

// ── Week key ─────────────────────────────────────────────────────────────

/**
 * Returns the ISO 8601 week key for a date — `YYYY-Www` (e.g. "2025-W03").
 * Calculation matches the ISO 8601 standard (week starts Monday, week 1 is
 * the week with the year's first Thursday).
 */
export function weekKeyForDate(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0, Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Returns the Monday (week start) and Sunday (week end) for the given date. */
export function weekRangeForDate(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0, Sun=6
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Picks this week's challenge set — one per module — deterministically
 * from the challenge library.
 */
export function challengesForWeek(date = new Date()): Challenge[] {
  const weekKey = weekKeyForDate(date);
  // Extract the numeric week from the key for the rotation index.
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  const yearNum = match ? parseInt(match[1]!, 10) : date.getFullYear();
  const weekNum = match ? parseInt(match[2]!, 10) : 1;
  // Use a stable seed combining year and week so it never repeats week-to-week
  // within a year, and wraps cleanly across years.
  const seed = yearNum * 100 + weekNum;

  const modules: ChallengeModule[] = ["wasl", "midan", "lamahat", "mashahd", "rihla"];
  return modules.map((mod, i) => {
    const pool = CHALLENGE_LIBRARY[mod];
    // Different offset per module so the same week doesn't always pick
    // the same index from every pool.
    const idx = ((seed + i * 7) % pool.length + pool.length) % pool.length;
    return pool[idx]!;
  });
}

// ── Progress tracking (localStorage) ──────────────────────────────────────

const PROGRESS_KEY_PREFIX = "cirkle-challenge-progress-";

function progressKey(weekKey: string): string {
  return `${PROGRESS_KEY_PREFIX}${weekKey}`;
}

function emptyProgress(challengeId: string): ChallengeProgress {
  return {
    challengeId,
    started: false,
    completed: false,
    startedAt: null,
    completedAt: null,
  };
}

/** Loads the progress map for a given week from localStorage. SSR-safe. */
export function loadProgress(weekKey: string): Record<string, ChallengeProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(progressKey(weekKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, ChallengeProgress> = {};
    for (const [id, val] of Object.entries(parsed)) {
      if (val && typeof val === "object") {
        const v = val as Partial<ChallengeProgress>;
        out[id] = {
          challengeId: id,
          started: Boolean(v.started),
          completed: Boolean(v.completed),
          startedAt: typeof v.startedAt === "string" ? v.startedAt : null,
          completedAt: typeof v.completedAt === "string" ? v.completedAt : null,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Persists the progress map for a given week to localStorage. SSR-safe. */
export function saveProgress(weekKey: string, progress: Record<string, ChallengeProgress>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(progressKey(weekKey), JSON.stringify(progress));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

/**
 * Records progress for a challenge in a given week.
 *   • markStarted=true  → set started=true, startedAt=now (idempotent)
 *   • markCompleted=true → set started=true AND completed=true, completedAt=now
 *
 * Returns the updated progress map.
 */
export function recordProgress(
  weekKey: string,
  challengeId: string,
  opts: { markStarted?: boolean; markCompleted?: boolean },
  date = new Date(),
): Record<string, ChallengeProgress> {
  const progress = loadProgress(weekKey);
  const existing = progress[challengeId] ?? emptyProgress(challengeId);
  const iso = date.toISOString();
  const updated: ChallengeProgress = {
    challengeId,
    started: existing.started || Boolean(opts.markStarted),
    completed: existing.completed || Boolean(opts.markCompleted),
    startedAt: existing.startedAt ?? (opts.markStarted ? iso : null),
    completedAt: existing.completedAt ?? (opts.markCompleted ? iso : null),
  };
  progress[challengeId] = updated;
  saveProgress(weekKey, progress);
  return progress;
}

// ── Badges ────────────────────────────────────────────────────────────────

/**
 * Computes badges for the current week based on completed-count.
 *   • 1+ completed → "Getting Started"
 *   • 3+ completed → "Halfway There"
 *   • 4+ completed → "Weekly Champion" (the main badge)
 *   • 5  completed → "Perfect Week"
 */
export function computeBadges(completedCount: number): ChallengeBadge[] {
  return [
    {
      id: "getting-started",
      label: "Getting Started",
      description: "Completed at least 1 weekly challenge.",
      emoji: "🌱",
      earned: completedCount >= 1,
    },
    {
      id: "halfway-there",
      label: "Halfway There",
      description: "Completed 3 of 5 weekly challenges.",
      emoji: "🚀",
      earned: completedCount >= 3,
    },
    {
      id: "weekly-champion",
      label: "Weekly Champion",
      description: "Completed 4 of 5 weekly challenges.",
      emoji: "🏆",
      earned: completedCount >= 4,
    },
    {
      id: "perfect-week",
      label: "Perfect Week",
      description: "Completed all 5 weekly challenges.",
      emoji: "💯",
      earned: completedCount >= 5,
    },
  ];
}

/** Whether the user has earned the "Weekly Champion" badge. */
export function isWeeklyChampion(completedCount: number): boolean {
  return completedCount >= 4;
}

// ── Mock leaderboard ──────────────────────────────────────────────────────
//
// Deterministic per week — same week key always returns the same leaderboard.
// In production this would come from a real participation table; for now we
// surface a believable, varied top 10 with the current user inserted at a
// sensible rank.

const MOCK_NAMES = [
  { name: "Layla Hassan", username: "layla.h" },
  { name: "Omar Khalil", username: "omar.k" },
  { name: "Yasmin Adel", username: "yasmin.a" },
  { name: "Karim Nabil", username: "karim.n" },
  { name: "Nour Hany", username: "nour.h" },
  { name: "Mariam Sami", username: "mariam.s" },
  { name: "Tarek Fouad", username: "tarek.f" },
  { name: "Salma Wagdy", username: "salma.w" },
  { name: "Hassan Maged", username: "hassan.m" },
  { name: "Aya Reda", username: "aya.r" },
];

export function buildLeaderboard(weekKey: string, myCompleted: number, myName = "You", myUsername = "you"): {
  leaderboard: ChallengeLeaderboardEntry[];
  myRank: number | null;
} {
  // Hash the weekKey for stable variation.
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = ((hash << 5) - hash + weekKey.charCodeAt(i)) | 0;
  }
  const seed = Math.abs(hash);

  // Generate a leaderboard of 10 mock users with deterministic completed counts.
  const mock = MOCK_NAMES.map((m, i) => ({
    ...m,
    completed: ((seed + i * 13) % 6) as number, // 0..5
  }))
    .sort((a, b) => b.completed - a.completed)
    .map((m, i) => ({
      rank: i + 1,
      name: m.name,
      username: m.username,
      completed: m.completed,
    }));

  // Insert the current user at their correct rank by completed count.
  let myRank: number | null = null;
  const leaderboard: ChallengeLeaderboardEntry[] = [];
  let inserted = false;
  for (const entry of mock) {
    if (!inserted && myCompleted >= entry.completed) {
      leaderboard.push({
        rank: leaderboard.length + 1,
        name: myName,
        username: myUsername,
        completed: myCompleted,
        isMe: true,
      });
      myRank = leaderboard.length;
      inserted = true;
    }
    leaderboard.push({
      rank: leaderboard.length + 1,
      name: entry.name,
      username: entry.username,
      completed: entry.completed,
    });
  }
  if (!inserted) {
    leaderboard.push({
      rank: leaderboard.length + 1,
      name: myName,
      username: myUsername,
      completed: myCompleted,
      isMe: true,
    });
    myRank = leaderboard.length;
  }

  // Re-number ranks after insertion (so ties share a rank).
  let prevCompleted = -1;
  let prevRank = 0;
  for (const e of leaderboard) {
    if (e.completed !== prevCompleted) {
      prevRank = e.rank;
      prevCompleted = e.completed;
    }
    e.rank = prevRank;
  }

  return { leaderboard, myRank };
}

// ── Top-level convenience ─────────────────────────────────────────────────

/**
 * Builds the full /api/challenges response payload for a given date.
 * The progress map is loaded from localStorage; on the server it's empty.
 */
export function buildChallengeResponse(
  date = new Date(),
  myName = "You",
  myUsername = "you",
): ChallengeResponse {
  const weekKey = weekKeyForDate(date);
  const { start, end } = weekRangeForDate(date);
  const challenges = challengesForWeek(date);
  const progress = loadProgress(weekKey);
  const completedCount = challenges.filter((c) => progress[c.id]?.completed).length;
  const champion = isWeeklyChampion(completedCount);
  const badges = computeBadges(completedCount);
  const { leaderboard, myRank } = buildLeaderboard(weekKey, completedCount, myName, myUsername);

  return {
    weekKey,
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    challenges,
    progress,
    completedCount,
    champion,
    badges,
    leaderboard,
    myRank,
    at: date.toISOString(),
  };
}
