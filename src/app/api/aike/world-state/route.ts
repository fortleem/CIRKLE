// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalWorldStateEngine } from "@/lib/autonomous-intelligence";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get("metric");
    const scope = searchParams.get("scope") || "global";

    if (metric) {
      const entry = globalWorldStateEngine.get(metric, scope);
      return NextResponse.json({ metric, scope, entry });
    }

    const entries = globalWorldStateEngine.getAll(scope);
    return NextResponse.json({ entries, count: entries.length, scope });
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
    const { metric, scope } = body;

    if (!metric) {
      return NextResponse.json(
        { error: "Missing required field: metric" },
        { status: 400 },
      );
    }

    await globalWorldStateEngine.refresh(metric, scope || "global");
    return NextResponse.json({ ok: true, message: `World state refreshed: ${metric}` });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
