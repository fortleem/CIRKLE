// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getCountry, getDefaultCountry } from "@/lib/countries";

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 2 * 60 * 1000; // 2 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const countryCode = (searchParams.get("country") || getDefaultCountry()).toUpperCase();
    const city = searchParams.get("city") || undefined;
    const personalizationContext = searchParams.get("personalizationContext");
    const personalAIConsent = searchParams.get("personalAIConsent") === "true";

    // Check cache
    const cacheKey = `${countryCode}:${city || ""}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTL) {
      return NextResponse.json(cached.data);
    }

    const country = getCountry(countryCode);
    if (!country) {
      return NextResponse.json({ error: "Unknown country" }, { status: 400 });
    }

    // Use CIRKLE Brain AI to generate REAL feed content
    const { generateProductionFeed } = await import("@/lib/ai-feed");
    let feed = await generateProductionFeed(country, city);

    // Apply personalization if consent granted
    if (personalAIConsent && personalizationContext && feed.featured.length > 0) {
      // Simple personalization: boost items matching user interests
      const lowerCtx = personalizationContext.toLowerCase();
      feed.featured = feed.featured.sort((a, b) => {
        const aMatch = (a.title + a.subtitle).toLowerCase().includes(lowerCtx.slice(0, 20)) ? 1 : 0;
        const bMatch = (b.title + b.subtitle).toLowerCase().includes(lowerCtx.slice(0, 20)) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    // Cache the result
    cache.set(cacheKey, { data: feed, ts: Date.now() });

    return NextResponse.json(feed);
  } catch (err) {
    // Return minimal feed on error
    return NextResponse.json({
      country: "EG",
      city: "Cairo",
      featured: [],
      nearby: [],
      trending: [],
      forYou: [],
      officialUpdates: [],
      spaces: [],
      weather: { city: "Cairo", tempC: 24, condition: "Clear", icon: "☀️" },
      generatedAt: new Date().toISOString(),
      error: "Feed generation failed",
    });
  }
}
