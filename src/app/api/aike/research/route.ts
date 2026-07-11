// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalResearchScheduler, globalKnowledgeGapDetector } from "@/lib/autonomous-intelligence";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "pending";

    if (view === "gaps") {
      const gaps = globalKnowledgeGapDetector.getOpenGaps();
      return NextResponse.json({ gaps, count: gaps.length });
    }

    if (view === "stats") {
      const stats = globalResearchScheduler.getStats();
      return NextResponse.json(stats);
    }

    const tasks = globalResearchScheduler.getPendingTasks();
    return NextResponse.json({ tasks, count: tasks.length });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, domain, priority, targetSources } = body;

    if (!query || !domain) {
      return NextResponse.json(
        { error: "Missing required fields: query, domain" },
        { status: 400 },
      );
    }

    const task = await globalResearchScheduler.scheduleTask({
      taskId: `rt_${Date.now().toString(36)}`,
      query,
      domain,
      priority: priority || "medium",
      targetSources: targetSources || [],
      status: "pending",
      scheduledFor: new Date().toISOString(),
      retryCount: 0,
    } as any);

    return NextResponse.json({
      ok: true,
      taskId: task.taskId,
      message: "Research task scheduled",
    });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
