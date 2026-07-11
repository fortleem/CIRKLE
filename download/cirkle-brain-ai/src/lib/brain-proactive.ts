/**
 * Cirkle Brain — Proactive Intelligence
 * 
 * Layer 7: Anticipates user needs before they ask.
 * Triggers: time-based, location-based, event-based, social-based, pattern-based.
 */

import "server-only";
import { aiComplete } from "@/lib/ai";
import { getCountry } from "@/lib/countries";

export type TriggerType = "time" | "location" | "event" | "social" | "pattern";

export interface ProactiveTrigger {
  id: string;
  type: TriggerType;
  title: string;
  description: string;
  action: string;
  priority: "low" | "medium" | "high";
  data: Record<string, unknown>;
  timestamp: number;
}

/**
 * Evaluate all proactive triggers for a user.
 */
export async function evaluateTriggers(params: {
  country: string;
  city?: string;
  hour: number;
  interests: string[];
  upcomingTrips: Array<{ destination: string; date: string }>;
  recentNewsCategories: string[];
  contactsOnline: number;
  lastFlightDate?: string;
  visaExpiryDate?: string;
}): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const { country, city, hour, interests, upcomingTrips, recentNewsCategories, contactsOnline } = params;
  const countryInfo = getCountry(country);

  // ── Time-based triggers ──
  if (hour >= 7 && hour <= 9 && recentNewsCategories.length > 0) {
    triggers.push({
      id: `time-morning-news-${Date.now()}`,
      type: "time",
      title: "Your morning briefing is ready",
      description: `Top ${recentNewsCategories[0]} news from ${city || countryInfo?.capital} curated by Cirkle AI`,
      action: "fetch-news",
      priority: "medium",
      data: { category: recentNewsCategories[0], country, city },
      timestamp: Date.now(),
    });
  }

  if (hour >= 22 && interests.includes("sports")) {
    triggers.push({
      id: `time-evening-sports-${Date.now()}`,
      type: "time",
      title: "Sports highlights ready",
      description: "Today's sports results and highlights based on your interests",
      action: "fetch-sports",
      priority: "low",
      data: { interest: "sports" },
      timestamp: Date.now(),
    });
  }

  // ── Trip-based triggers ──
  for (const trip of upcomingTrips) {
    const daysUntil = Math.ceil((new Date(trip.date).getTime() - Date.now()) / 86400000);

    if (daysUntil <= 30 && daysUntil > 0) {
      triggers.push({
        id: `trip-reminder-${trip.destination}-${Date.now()}`,
        type: "event",
        title: `${trip.destination} trip in ${daysUntil} days`,
        description: `Check visa requirements, book flights, and prepare for your trip to ${trip.destination}`,
        action: "prepare-trip",
        priority: daysUntil <= 7 ? "high" : "medium",
        data: { destination: trip.destination, date: trip.date, daysUntil },
        timestamp: Date.now(),
      });
    }

    if (daysUntil <= 14 && daysUntil > 7) {
      triggers.push({
        id: `trip-flights-${trip.destination}-${Date.now()}`,
        type: "event",
        title: `Book flights to ${trip.destination} now`,
        description: "AI Brain predicts prices will rise in the next 7 days",
        action: "search-flights",
        priority: "high",
        data: { destination: trip.destination },
        timestamp: Date.now(),
      });
    }
  }

  // ── Visa expiry trigger ──
  if (params.visaExpiryDate) {
    const daysUntilExpiry = Math.ceil((new Date(params.visaExpiryDate).getTime() - Date.now()) / 86400000);
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      triggers.push({
        id: `visa-expiry-${Date.now()}`,
        type: "event",
        title: `Visa expires in ${daysUntilExpiry} days`,
        description: "Start your visa renewal process now to avoid travel disruption",
        action: "visa-renewal",
        priority: "high",
        data: { expiryDate: params.visaExpiryDate, daysUntil: daysUntilExpiry },
        timestamp: Date.now(),
      });
    }
  }

  // ── Social triggers ──
  if (contactsOnline >= 3) {
    triggers.push({
      id: `social-online-${Date.now()}`,
      type: "social",
      title: `${contactsOnline} friends are online`,
      description: "Start a group chat or join a Voice Room in Midan",
      action: "suggest-social",
      priority: "low",
      data: { onlineCount: contactsOnline },
      timestamp: Date.now(),
    });
  }

  // ── Pattern-based triggers ──
  if (hour >= 12 && hour <= 13 && interests.includes("food")) {
    triggers.push({
      id: `pattern-lunch-${Date.now()}`,
      type: "pattern",
      title: "Lunch time!",
      description: `Popular restaurants near you in ${city || countryInfo?.capital}`,
      action: "suggest-restaurants",
      priority: "low",
      data: { country, city, meal: "lunch" },
      timestamp: Date.now(),
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return triggers.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
}

/**
 * Generate a personalized morning briefing using AI.
 */
export async function generateMorningBriefing(params: {
  country: string;
  city?: string;
  interests: string[];
  userName: string;
}): Promise<string> {
  const countryInfo = getCountry(params.country);
  const sys = `You are the Cirkle Brain. Generate a personalized morning briefing. Be warm, concise, and actionable. Include: weather, top news, calendar reminders, and a motivational note.`;
  const usr = `Generate a morning briefing for ${params.userName} in ${params.city || countryInfo?.capital}, ${countryInfo?.name}. Interests: ${params.interests.join(", ") || "general"}. Keep it under 150 words.`;

  const raw = await aiComplete(sys, usr, 400, false);
  return raw || `Good morning, ${params.userName}! Here's your briefing from ${params.city || countryInfo?.capital}. Check the Home tab for today's news and weather.`;
}
