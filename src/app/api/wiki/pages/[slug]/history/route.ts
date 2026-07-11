import { NextRequest, NextResponse } from "next/server";
import { getPage, getPageHistory, restoreVersion } from "@/lib/knowledge-wiki";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wiki/pages/[slug]/history?circleId=<id>
// Returns the page + full version history (oldest first).
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const circleId = req.nextUrl.searchParams.get("circleId");
    if (!circleId) {
      return NextResponse.json({ error: "circleId is required" }, { status: 400 });
    }
    const page = await getPage(circleId, slug);
    if (!page) return NextResponse.json({ error: "page not found" }, { status: 404 });
    const history = await getPageHistory(page.id);
    return NextResponse.json({ page, history });
  } catch (err) {
    logger.error("[/api/wiki/pages/[slug]/history GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load history" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wiki/pages/[slug]/history?circleId=<id>
// Body: { action: "restore", version: number, author: string }
// Restores a previous version (snapshots the old content as a new version).
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const circleId = req.nextUrl.searchParams.get("circleId");
    if (!circleId) {
      return NextResponse.json({ error: "circleId is required" }, { status: 400 });
    }
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    if (body.action !== "restore") {
      return NextResponse.json({ error: "action must be 'restore'" }, { status: 400 });
    }
    const version = Number(body.version);
    const author = String(body.author || "");
    if (!isFinite(version) || version < 1) {
      return NextResponse.json({ error: "version must be a positive integer" }, { status: 400 });
    }
    if (!author) {
      return NextResponse.json({ error: "author is required" }, { status: 400 });
    }

    const page = await getPage(circleId, slug);
    if (!page) return NextResponse.json({ error: "page not found" }, { status: 404 });
    const restored = await restoreVersion(page.id, version, author);
    return NextResponse.json({ ok: true, page: restored }, { status: 201 });
  } catch (err) {
    logger.error("[/api/wiki/pages/[slug]/history POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to restore version" },
      { status: 500 },
    );
  }
}
