// @ts-nocheck
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";

/**
 * POST /api/ai/itinerary
 * Body: {destination, days, travelers, budget, interests, language?}
 * Returns {itinerary} after a 600ms delay.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      destination?: string;
      days?: number;
      travelers?: number;
      budget?: string;
      interests?: string[];
      language?: string;
    };

    const destination = body.destination?.trim() || "Cairo";
    const days = Math.max(1, Math.min(14, Number(body.days) || 3));
    const travelers = Math.max(1, Number(body.travelers) || 1);
    const budget = body.budget?.trim() || "mid-range";
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((i) => typeof i === "string")
      : [];

    await new Promise((r) => setTimeout(r, 600));

    let itinerary;
    try {
      // Hard 12s ceiling on the AI call so the fallback itinerary always
      // wins when the 4-provider chain takes too long.
      itinerary = await Promise.race([
        aiComplete({
          destination,
          days,
          travelers,
          budget,
          interests,
          language: body.language,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("itinerary_ai_timeout")), 12000),
        ),
      ]);
    } catch (aiErr) {
      console.warn("[/api/ai/itinerary] AI failed, returning fallback", aiErr);
      // Inline fallback so the UI never breaks.
      itinerary = {
        days: Array.from({ length: days }, (_, i) => ({
          title: `Day ${i + 1} — ${destination}`,
          blocks: [
            { time: "09:00", title: "Breakfast", description: "Local café start.", kind: "food" as const },
            { time: "11:00", title: "Morning activity", description: "Explore a highlight.", kind: "activity" as const },
            { time: "13:30", title: "Lunch", description: "Try a regional dish.", kind: "food" as const },
            { time: "16:00", title: "Afternoon activity", description: "Culture & sights.", kind: "activity" as const },
            { time: "20:00", title: "Dinner", description: "Recommended restaurant.", kind: "food" as const },
          ],
        })),
      };
    }

    return NextResponse.json({ itinerary });
  } catch (err) {
    logger.error("[/api/ai/itinerary] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "itinerary failed" },
      { status: 500 },
    );
  }
}
