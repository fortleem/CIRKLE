import { NextRequest, NextResponse } from "next/server";
import { generateSuggestions, executeWorkflow, trackSuggestion, type OrchestratorContext } from "@/lib/brain-orchestrator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || "anonymous";
  const country = searchParams.get("country") || "EG";
  const city = searchParams.get("city") || undefined;
  const currentTab = searchParams.get("tab") || undefined;
  const mood = searchParams.get("mood") || undefined;
  const ctx: OrchestratorContext = { username, country, city, currentTab, mood };
  const suggestions = await generateSuggestions(ctx);
  return NextResponse.json({ suggestions });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body.workflow) {
    const result = await executeWorkflow(body.workflow, body.params || {}, body.context || {});
    return NextResponse.json(result);
  }
  if (body.track) {
    await trackSuggestion(body.suggestionId, body.track);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
