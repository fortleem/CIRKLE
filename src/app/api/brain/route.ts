import { NextRequest, NextResponse } from "next/server";
import { askBrain, getBrainStats, getProactiveTriggers, getMorningBriefing } from "@/lib/brain-orchestrator";

// POST /api/brain — Main Brain query endpoint
export async function POST(req: NextRequest) {
  try {
    const { query, country, city, language, userId, useReasoning } = await req.json();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const response = await askBrain({
      query,
      country: country || "EG",
      city,
      language: language || "en",
      username: userId,
      useReasoning: useReasoning || false,
    });

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: "Brain query failed", details: String(err) }, { status: 500 });
  }
}

// GET /api/brain — Brain stats, triggers, briefing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "stats") {
    const stats = await getBrainStats();
    return NextResponse.json(stats);
  }

  if (action === "triggers") {
    const triggers = await getProactiveTriggers({
      country: searchParams.get("country") || "EG",
      city: searchParams.get("city") || undefined,
      interests: (searchParams.get("interests") || "").split(",").filter(Boolean),
      upcomingTrips: [],
      recentNewsCategories: (searchParams.get("categories") || "breaking,local").split(","),
    });
    return NextResponse.json({ triggers });
  }

  if (action === "briefing") {
    const briefing = await getMorningBriefing({
      country: searchParams.get("country") || "EG",
      city: searchParams.get("city") || undefined,
    });
    return NextResponse.json({ briefing });
  }

  return NextResponse.json({ error: "Use ?action=stats|triggers|briefing or POST with query" }, { status: 400 });
}
