// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalKnowledgeSourceRegistry } from "@/lib/autonomous-intelligence/data-sources/knowledge-source-registry";
import { getRegistryStats } from "@/lib/autonomous-intelligence/data-sources";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "stats";

    if (view === "stats") {
      const stats = globalKnowledgeSourceRegistry.getStats();
      const registryStats = getRegistryStats();
      return NextResponse.json({
        ...stats,
        ...registryStats,
        timestamp: new Date().toISOString(),
      });
    }

    if (view === "all") {
      const sources = globalKnowledgeSourceRegistry.getAllSources();
      return NextResponse.json({ sources, count: sources.length });
    }

    if (view === "available") {
      const sources = globalKnowledgeSourceRegistry.getAllSources().filter(s => s.available);
      return NextResponse.json({ sources, count: sources.length });
    }

    if (view === "free") {
      const sources = globalKnowledgeSourceRegistry.getAllSources().filter(s => s.free && !s.requiresApiKey);
      return NextResponse.json({ sources, count: sources.length });
    }

    // Default: return stats
    const stats = globalKnowledgeSourceRegistry.getStats();
    return NextResponse.json(stats);
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
    const { domain, capabilities, coverage, minTrustScore, freeOnly, noApiKeyRequired, limit } = body;

    const sources = globalKnowledgeSourceRegistry.selectSources({
      domain,
      capabilities,
      coverage,
      minTrustScore,
      freeOnly,
      noApiKeyRequired,
      limit: limit || 10,
    });

    return NextResponse.json({ sources, count: sources.length });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
