// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalEventLearningEngine } from "@/lib/autonomous-intelligence";
import type { PlatformEvent } from "@/lib/autonomous-intelligence";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, type, userId, entityIds, payload, consentGranted, sessionId } = body;

    if (!category || !type) {
      return NextResponse.json(
        { error: "Missing required fields: category, type" },
        { status: 400 },
      );
    }

    const event: PlatformEvent = {
      eventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      category,
      type,
      timestamp: new Date().toISOString(),
      userId,
      entityIds: entityIds || [],
      payload: payload || {},
      consentGranted: consentGranted !== false,
      sessionId,
    };

    await globalEventLearningEngine.ingestEvent(event);

    return NextResponse.json({
      ok: true,
      eventId: event.eventId,
      message: "Event ingested for autonomous learning",
    });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const category = searchParams.get("category");

    if (userId) {
      const events = globalEventLearningEngine.getEventsByUser(userId);
      return NextResponse.json({ events, count: events.length });
    }

    if (category) {
      const events = globalEventLearningEngine.getEventsByCategory(category);
      return NextResponse.json({ events, count: events.length });
    }

    const stats = globalEventLearningEngine.getEventStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
