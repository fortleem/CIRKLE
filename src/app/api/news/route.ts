// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getCountry, getDefaultCountry } from "@/lib/countries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countryCode = (searchParams.get("country") || getDefaultCountry()).toUpperCase();
  const city = searchParams.get("city") || undefined;
  const country = getCountry(countryCode);
  if (!country) return NextResponse.json({ error: "Unknown country" }, { status: 400 });

  const sources = country.newsSources.map((s, i) => ({
    id: `ou${i}`, name: s.name, arabicName: s.name, handle: s.handle || "@source",
    category: s.category || "media", latestUpdate: "", subs: null, verified: true, isEmergency: false,
  }));
  sources.push({ id: `ou${sources.length}`, name: "Civil Defense", arabicName: "الدفاع المدني",
    handle: "@civildefense", category: "emergency", latestUpdate: "", subs: null, verified: true, isEmergency: true });

  // Use CIRKLE Brain AI (Groq/Gemini/OpenAI)
  let breaking = [];
  try {
    const { generateNewsViaAI } = await import("@/lib/news-fallback");
    breaking = await generateNewsViaAI(countryCode, city);
  } catch {}

  return NextResponse.json({ country: countryCode, city: city || country.capital, sources, breaking });
}
