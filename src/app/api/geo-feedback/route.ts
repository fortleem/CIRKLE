import { NextRequest, NextResponse } from "next/server";
import { globalLearningEngine, type LearningEvent } from "@/lib/location-intelligence";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, placeId, placeType, action, feedback } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  const event: LearningEvent = {
    userId,
    placeId,
    placeType,
    action,
    timestamp: new Date().toISOString(),
    context: {
      timeOfDay: getTimeOfDay(),
      dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }),
    },
    feedback,
  };

  globalLearningEngine.record(event);

  return NextResponse.json({
    ok: true,
    recorded: event,
    preferences: globalLearningEngine.getPreferences(userId)?.favoriteTypes || [],
  });
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}
