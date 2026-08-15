/**
 * Social Rituals — Task CREATIVE-1, Feature #2.
 *
 * Daily engagement prompts that encourage authentic sharing — like BeReal but
 * better: bilingual (Arabic + English), time-of-day aware, never repeating
 * within a week, with a participation streak tracked in localStorage.
 *
 * This file is pure (no React, no DB) — consumed by:
 *   • `GET /api/rituals`         — today's ritual + user streak
 *   • The profile screen         — streak badge
 *   • Any UI that wants to show the daily prompt
 */

// ── Types ────────────────────────────────────────────────────────────────

export type RitualSlot = "morning" | "afternoon" | "evening" | "weekend";

export interface Ritual {
  /** Stable ID (used as the localStorage key for participation). */
  id: string;
  /** Time-of-day slot. */
  slot: RitualSlot;
  /** Arabic prompt. */
  ar: string;
  /** English prompt. */
  en: string;
  /** Suggested media type the ritual encourages (e.g. "photo" for the weekend ritual). */
  suggestedMedia?: "photo" | "video" | "text";
  /** Emoji shown in the UI. */
  emoji: string;
}

export interface RitualStreak {
  /** Current consecutive-day streak. Resets if a day is missed. */
  current: number;
  /** Longest streak ever achieved. */
  longest: number;
  /** ISO date (YYYY-MM-DD) of the last participation. */
  lastParticipation: string | null;
  /** Total rituals participated in, all-time. */
  total: number;
}

export interface RitualResponse {
  /** Today's ritual (based on local server time + slot rotation). */
  ritual: Ritual;
  /** The user's streak (hydrated from localStorage by the client). */
  streak: RitualStreak;
  /** Local server time (ISO) so the client can compute "time until next ritual". */
  serverTime: string;
  /** Whether the user has already participated in today's ritual. */
  participatedToday: boolean;
}

// ── Ritual library ─────────────────────────────────────────────────────────
//
// 7 distinct rituals per slot → 28 total. Each day of the week picks a
// different ritual from the slot's pool, indexed by `dayOfWeek % pool.length`,
// so within a single calendar week the same ritual never repeats.

export const RITUALS: Record<RitualSlot, Ritual[]> = {
  morning: [
    { id: "morning-gratitude", slot: "morning", ar: "صباح الفل! ايه أكتر حاجة ممتنلها النهارده؟", en: "Good morning! What are you grateful for today?", emoji: "🌅", suggestedMedia: "text" },
    { id: "morning-excited", slot: "morning", ar: "صباح السعادة! ايه الحاجة اللي مستنيها بفارغ الصبر النهارده؟", en: "Good morning! What are you excited about today?", emoji: "☀️", suggestedMedia: "text" },
    { id: "morning-intention", slot: "morning", ar: "ابدأ يومك بنية واحدة. ايه اللي عاوز تركز عليه؟", en: "Start your day with one intention. What do you want to focus on?", emoji: "🎯", suggestedMedia: "text" },
    { id: "morning-coffee", slot: "morning", ar: "أول رشفة قهوة النهارده. شارك اللحظة.", en: "First sip of coffee today. Share the moment.", emoji: "☕", suggestedMedia: "photo" },
    { id: "morning-sky", slot: "morning", ar: "صورة للسمة الفجر. كل يوم لون مختلف.", en: "A photo of the dawn sky. A different color every day.", emoji: "🌇", suggestedMedia: "photo" },
    { id: "morning-music", slot: "morning", ar: "أغنية بتعكس مزاجك الصبح. ايه هي النهارده؟", en: "A song that matches your morning mood. What is it today?", emoji: "🎵", suggestedMedia: "text" },
    { id: "morning-goal", slot: "morning", ar: "حاجة صغيرة عاوز تخلصها النهارده. اكتبها عشان تلتزم بيها.", en: "One small thing you want to finish today. Write it down to commit.", emoji: "✅", suggestedMedia: "text" },
  ],
  afternoon: [
    { id: "afternoon-now", slot: "afternoon", ar: "خد لحظة — ايه اللي بتعمله دلوقتي بالظبط؟", en: "Take a moment — what are you doing right now, exactly?", emoji: "⏰", suggestedMedia: "photo" },
    { id: "afternoon-snack", slot: "afternoon", ar: "سناك بعد الضهر. شارك معانا.", en: "Afternoon snack. Share it with us.", emoji: "🍎", suggestedMedia: "photo" },
    { id: "afternoon-view", slot: "afternoon", ar: "المنظر قدامك دلوقتي. صورته.", en: "The view in front of you right now. Photograph it.", emoji: "📸", suggestedMedia: "photo" },
    { id: "afternoon-pause", slot: "afternoon", ar: "قف 30 ثانية. خد نفس عميق. ايه اللي لفت انتباهك؟", en: "Pause for 30 seconds. Take a deep breath. What caught your attention?", emoji: "🧘", suggestedMedia: "text" },
    { id: "afternoon-learned", slot: "afternoon", ar: "حاجة جديدة اتعلمتها النهارده لحد دلوقتي.", en: "Something new you've learned so far today.", emoji: "💡", suggestedMedia: "text" },
    { id: "afternoon-help", slot: "afternoon", ar: "حد ساعدك النهارده؟ اكتبله شكر صغير.", en: "Did someone help you today? Write them a small thank-you.", emoji: "🙏", suggestedMedia: "text" },
    { id: "afternoon-laugh", slot: "afternoon", ar: "حاجة ضحكتك النهارده. شاركها.", en: "Something that made you laugh today. Share it.", emoji: "😂", suggestedMedia: "text" },
  ],
  evening: [
    { id: "evening-best", slot: "evening", ar: "إيه أحلي حاجة حصلت النهارده؟", en: "What was the best part of your day?", emoji: "🌙", suggestedMedia: "text" },
    { id: "evening-lesson", slot: "evening", ar: "درس اتعلمته النهارده — صغير أو كبير.", en: "A lesson you learned today — small or big.", emoji: "🎓", suggestedMedia: "text" },
    { id: "evening-people", slot: "evening", ar: "أحلى شخص اتواصلت معاه النهارده.", en: "The best person you connected with today.", emoji: "💛", suggestedMedia: "text" },
    { id: "evening-photo", slot: "evening", ar: "صورة واحدة تلخص نهارك.", en: "One photo that captures your day.", emoji: "🖼️", suggestedMedia: "photo" },
    { id: "evening-let-go", slot: "evening", ar: "حاجة عاوز تسيبها ورا ظهرك قبل ما تنام.", en: "Something you want to leave behind before you sleep.", emoji: "🍃", suggestedMedia: "text" },
    { id: "evening-tomorrow", slot: "evening", ar: "حاجة واحدة بتتطلع ليها بكره.", en: "One thing you're looking forward to tomorrow.", emoji: "✨", suggestedMedia: "text" },
    { id: "evening-music", slot: "evening", ar: "أغنية قبل النوم. ايه هي؟", en: "A song before sleep. What is it?", emoji: "🎶", suggestedMedia: "text" },
  ],
  weekend: [
    { id: "weekend-photo-day", slot: "weekend", ar: "شاركنا صورة من نهارتك.", en: "Share a photo from your day.", emoji: "📷", suggestedMedia: "photo" },
    { id: "weekend-outing", slot: "weekend", ar: "طلعت فين النهارده؟ شارك المكان.", en: "Where did you go today? Share the place.", emoji: "📍", suggestedMedia: "photo" },
    { id: "weekend-food", slot: "weekend", ar: "أحلى أكلة جربتها النهارده.", en: "The best dish you tried today.", emoji: "🍽️", suggestedMedia: "photo" },
    { id: "weekend-people", slot: "weekend", ar: "مين اللي قضيت معاه أحلى وقت النهارده؟", en: "Who did you spend the best time with today?", emoji: "👥", suggestedMedia: "text" },
    { id: "weekend-discovery", slot: "weekend", ar: "اكتشاف جديد النهارده — مكان، أغنية، كتاب، أي حاجة.", en: "A new discovery today — place, song, book, anything.", emoji: "🔍", suggestedMedia: "text" },
    { id: "weekend-rest", slot: "weekend", ar: "إزاي استرحت النهارده؟", en: "How did you rest today?", emoji: "😌", suggestedMedia: "text" },
    { id: "weekend-adventure", slot: "weekend", ar: "أصغر مغامرة النهارده.", en: "The smallest adventure of today.", emoji: "🚶", suggestedMedia: "photo" },
  ],
};

// ── Slot determination ────────────────────────────────────────────────────

/**
 * Determines the ritual slot based on the hour-of-day (local server time).
 *
 *   5:00–11:59   → morning
 *   12:00–16:59  → afternoon
 *   17:00–4:59   → evening
 *   Fri / Sat    → weekend (overrides the time-of-day slot — Friday-Saturday
 *                  is the Arab weekend)
 */
export function slotForDate(date: Date): RitualSlot {
  // getDay() returns 0 (Sun) – 6 (Sat). Friday = 5, Saturday = 6.
  const day = date.getDay();
  if (day === 5 || day === 6) return "weekend";

  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

// ── Ritual selection (deterministic, no repeats within a week) ─────────────

/**
 * Picks today's ritual from the slot's pool. The pool index is derived from
 * `(dayOfYear + year*7) % pool.length` so:
 *   • Same calendar day → same ritual (deterministic across reloads)
 *   • Consecutive days within a week → different rituals (because the pool
 *     has 7 entries and the index advances by 1 each day)
 *   • Across years → wraps naturally
 */
export function ritualForDate(date: Date): Ritual {
  const slot = slotForDate(date);
  const pool = RITUALS[slot];
  if (!pool || pool.length === 0) {
    // Defensive — should never happen.
    return {
      id: "fallback",
      slot,
      ar: "شاركنا لحظة من يومك.",
      en: "Share a moment from your day.",
      emoji: "✨",
    };
  }
  // dayOfYear is 1-based.
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  const idx = ((dayOfYear + date.getFullYear() * 7) % pool.length + pool.length) % pool.length;
  return pool[idx]!;
}

// ── Streak tracking (localStorage) ─────────────────────────────────────────

const STREAK_KEY = "cirkle-ritual-streak";
const PARTICIPATION_PREFIX = "cirkle-ritual-participated-";

/** Returns a fresh, zeroed streak object. */
export function emptyStreak(): RitualStreak {
  return { current: 0, longest: 0, lastParticipation: null, total: 0 };
}

/** Loads the streak from localStorage. SSR-safe (returns empty on server). */
export function loadStreak(): RitualStreak {
  if (typeof window === "undefined") return emptyStreak();
  try {
    const raw = window.localStorage.getItem(STREAK_KEY);
    if (!raw) return emptyStreak();
    const parsed = JSON.parse(raw) as Partial<RitualStreak>;
    return {
      current: typeof parsed.current === "number" ? parsed.current : 0,
      longest: typeof parsed.longest === "number" ? parsed.longest : 0,
      lastParticipation: typeof parsed.lastParticipation === "string" ? parsed.lastParticipation : null,
      total: typeof parsed.total === "number" ? parsed.total : 0,
    };
  } catch {
    return emptyStreak();
  }
}

/** Persists the streak to localStorage. SSR-safe (no-op on server). */
export function saveStreak(streak: RitualStreak): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch {
    /* localStorage quota / private mode — silently ignore */
  }
}

/** Returns YYYY-MM-DD in the user's local timezone. */
function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns the YYYY-MM-DD for `n` days before the given date. */
function dayOffsetKey(days: number, date = new Date()): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

/**
 * Records participation for today's ritual and updates the streak. Idempotent
 * for the same calendar day — calling twice in one day only increments the
 * streak once (but always updates `lastParticipation`).
 *
 * Streak logic:
 *   • lastParticipation === yesterday → current += 1
 *   • lastParticipation === today     → current unchanged (already counted)
 *   • otherwise                        → current = 1 (reset)
 *   • longest = max(longest, current)
 *   • total += 1 (every participation counts, even same-day re-dos)
 */
export function recordParticipation(ritualId: string, date = new Date()): RitualStreak {
  const streak = loadStreak();
  const today = todayKey(date);
  const yesterday = dayOffsetKey(-1, date);

  const participationKey = `${PARTICIPATION_PREFIX}${today}`;
  const alreadyToday = typeof window !== "undefined"
    && window.localStorage.getItem(participationKey) === ritualId;

  if (!alreadyToday) {
    if (streak.lastParticipation === yesterday) {
      streak.current += 1;
    } else if (streak.lastParticipation === today) {
      /* Same-day re-do — keep current as-is. */
    } else {
      streak.current = 1;
    }
    streak.longest = Math.max(streak.longest, streak.current);
    streak.lastParticipation = today;
    streak.total += 1;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(participationKey, ritualId);
      } catch {
        /* ignore */
      }
    }
    saveStreak(streak);
  }

  return streak;
}

/** Whether the user has already participated in today's ritual. */
export function hasParticipatedToday(ritualId: string, date = new Date()): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`${PARTICIPATION_PREFIX}${todayKey(date)}`) === ritualId;
  } catch {
    return false;
  }
}

/** Builds the full /api/rituals response payload. */
export function buildRitualResponse(date = new Date()): RitualResponse {
  const ritual = ritualForDate(date);
  return {
    ritual,
    streak: loadStreak(),
    serverTime: date.toISOString(),
    participatedToday: hasParticipatedToday(ritual.id, date),
  };
}
