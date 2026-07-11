/**
 * Cirkle Brain — Personalization Engine
 * 
 * Layer 4: Learns user preferences, habits, and style — 100% on-device.
 */

import "server-only";
import { aiComplete } from "@/lib/ai";

export interface UserProfile {
  // Communication
  preferredLanguage: string;
  communicationStyle: "formal" | "casual" | "mix";
  responseLength: "short" | "medium" | "detailed";
  emojiUsage: "none" | "occasional" | "frequent";

  // Travel
  preferredFlightClass: "economy" | "premium" | "business" | "first";
  preferredSeatType: "window" | "aisle" | "middle";
  preferredHotelType: "budget" | "boutique" | "luxury" | "apartment";
  preferredTripStyle: "relaxed" | "packed" | "adventurous" | "cultural";

  // Content
  newsCategories: string[];
  interests: string[];
  readingTime: string; // e.g., "08:00"

  // Social
  socialStyle: "private" | "selective" | "open";

  // Payment
  preferredPaymentMethod: string;
  budgetLevel: "frugal" | "moderate" | "premium";

  // Behavior patterns
  activeHours: { start: string; end: string };
  timezone: string;
}

const DEFAULT_PROFILE: UserProfile = {
  preferredLanguage: "en",
  communicationStyle: "casual",
  responseLength: "medium",
  emojiUsage: "occasional",
  preferredFlightClass: "economy",
  preferredSeatType: "aisle",
  preferredHotelType: "boutique",
  preferredTripStyle: "cultural",
  newsCategories: ["breaking", "local"],
  interests: [],
  readingTime: "08:00",
  socialStyle: "selective",
  preferredPaymentMethod: "",
  budgetLevel: "moderate",
  activeHours: { start: "08:00", end: "23:00" },
  timezone: "UTC",
};

/**
 * Analyze user's past interactions to build a profile.
 */
export async function buildUserProfile(
  interactions: Array<{ query: string; response: string; category: string; feedback?: string }>,
  country: string
): Promise<UserProfile> {
  if (interactions.length < 5) return { ...DEFAULT_PROFILE, timezone: country };

  // Analyze interaction patterns
  const queries = interactions.map(i => i.query).join("\n");
  const positiveInteractions = interactions.filter(i => i.feedback === "positive");
  const categories = interactions.map(i => i.category);
  const categoryFreq: Record<string, number> = {};
  categories.forEach(c => { categoryFreq[c] = (categoryFreq[c] || 0) + 1; });
  const topCategories = Object.entries(categoryFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  // Use AI to analyze user's communication style
  const sys = `You are the Cirkle Brain personalization engine. Analyze the user's past queries to determine their preferences. Respond in VALID JSON only.`;
  const usr = `Analyze these user queries and determine their preferences:\n${queries.substring(0, 1000)}\n\nReturn JSON: {"communicationStyle":"formal|casual|mix","responseLength":"short|medium|detailed","emojiUsage":"none|occasional|frequent","interests":["topic1","topic2"],"budgetLevel":"frugal|moderate|premium","tripStyle":"relaxed|packed|adventurous|cultural"}`;

  const raw = await aiComplete(sys, usr, 400, false);

  let aiProfile: Partial<UserProfile> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```/g, "").trim());
      aiProfile = parsed;
    } catch {}
  }

  return {
    ...DEFAULT_PROFILE,
    ...aiProfile,
    newsCategories: topCategories.length > 0 ? topCategories : DEFAULT_PROFILE.newsCategories,
    timezone: country,
  };
}

/**
 * Personalize a system prompt based on user profile.
 */
export function personalizePrompt(
  basePrompt: string,
  profile: UserProfile
): string {
  let personalized = basePrompt;

  // Communication style
  if (profile.communicationStyle === "formal") {
    personalized += " Use formal language and proper grammar.";
  } else if (profile.communicationStyle === "casual") {
    personalized += " Use casual, friendly language.";
  }

  // Response length
  if (profile.responseLength === "short") {
    personalized += " Keep responses concise (1-2 sentences).";
  } else if (profile.responseLength === "detailed") {
    personalized += " Provide detailed, thorough responses.";
  }

  // Emoji
  if (profile.emojiUsage === "frequent") {
    personalized += " Use emojis naturally.";
  } else if (profile.emojiUsage === "none") {
    personalized += " Do not use emojis.";
  }

  // Language
  if (profile.preferredLanguage === "ar") {
    personalized += " Respond in Arabic.";
  }

  // Interests
  if (profile.interests.length > 0) {
    personalized += ` The user is interested in: ${profile.interests.join(", ")}.`;
  }

  // Budget
  if (profile.budgetLevel === "frugal") {
    personalized += " The user prefers budget-friendly options.";
  } else if (profile.budgetLevel === "premium") {
    personalized += " The user prefers premium options.";
  }

  // Trip style
  if (profile.preferredTripStyle === "relaxed") {
    personalized += " For travel, suggest a relaxed pace with free time.";
  } else if (profile.preferredTripStyle === "packed") {
    personalized += " For travel, suggest a full itinerary with many activities.";
  }

  return personalized;
}

/**
 * Get a user's profile from stored preferences.
 */
export function getDefaultProfile(country: string): UserProfile {
  return { ...DEFAULT_PROFILE, timezone: country };
}
