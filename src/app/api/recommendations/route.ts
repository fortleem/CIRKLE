import { NextRequest, NextResponse } from "next/server";
import { globalProviderRegistry, rankPlaces, globalLearningEngine, ALL_PLACE_TYPES, CONTEXT_INTELLIGENCE } from "@/lib/location-intelligence";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const userId = searchParams.get("userId") || "anonymous";
  const limit = parseInt(searchParams.get("limit") || "5");

  if (!lat || !lng) return NextResponse.json({ error: "lat and lng required" }, { status: 400 });

  // Get user preferences from learning engine
  const prefs = globalLearningEngine.getPreferences(userId);
  const preferredTypes = prefs?.favoriteTypes || ALL_PLACE_TYPES.slice(0, 10);

  // Search nearby using user's preferred types
  const places = await globalProviderRegistry.searchAll({
    lat, lng, radiusMeters: 2000, types: preferredTypes, limit: limit * 3,
  });

  // Rank with user preferences
  const ranked = rankPlaces(places, lat, lng, prefs || undefined);

  // Return top recommendations with explanations
  const recommendations = ranked.slice(0, limit).map(p => ({
    ...p,
    explanation: p.reasons.length > 0
      ? `Recommended because ${p.reasons.join(", ")}.`
      : "Recommended based on proximity and relevance.",
  }));

  return NextResponse.json({
    recommendations,
    count: recommendations.length,
    userPreferences: prefs ? {
      favoriteTypes: prefs.favoriteTypes,
      budget: prefs.budgetPreference,
      transport: prefs.transportationPreference,
    } : null,
    learningActive: true,
  });
}
