// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getCountry, getDefaultCountry } from "@/lib/countries";
import { orchestrateNews } from "@/lib/news-orchestrator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countryCode = (searchParams.get("country") || getDefaultCountry()).toUpperCase();
  const city = searchParams.get("city") || undefined;
  const category = searchParams.get("category") || "breaking";
  const language = (searchParams.get("lang") === "ar" ? "ar" : "en") as "en" | "ar";
  const country = getCountry(countryCode);
  if (!country) return NextResponse.json({ error: "Unknown country" }, { status: 400 });

  // Build official sources list
  const sources = country.newsSources.map((s, i) => ({
    id: `ou${i}`, name: s.name, arabicName: s.name, handle: s.handle || "@source",
    category: s.category || "media", latestUpdate: "", subs: null, verified: true, isEmergency: false,
  }));
  sources.push({ id: `ou${sources.length}`, name: "Civil Defense", arabicName: "الدفاع المدني",
    handle: "@civildefense", category: "emergency", latestUpdate: "", subs: null, verified: true, isEmergency: true });

  // Use CIRKLE Brain AI News Orchestrator (all 4 providers + web search + scraping)
  let breaking: any[] = [];
  try {
    breaking = await orchestrateNews({
      country: countryCode,
      city,
      category: category as any,
      language,
      count: 10,
    });
  } catch {
    // Fallback to news-fallback.ts if orchestrator fails
    try {
      const { generateNewsViaAI } = await import("@/lib/news-fallback");
      breaking = await generateNewsViaAI(countryCode, city, category);
    } catch {}
  }

  return NextResponse.json({
    country: countryCode,
    city: city || country.capital,
    sources,
    breaking,
    orchestrator: {
      providers: ["openrouter", "gemini", "groq", "huggingface"],
      webSearch: true,
      webScraping: true,
      countriesSupported: 246,
    },
  });
}
