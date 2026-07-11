import { NextRequest, NextResponse } from "next/server";
import { getPage, updatePage, type UpdatePageOpts } from "@/lib/knowledge-wiki";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wiki/pages/[slug]?circleId=<id>
// Returns the page (or 404).
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
    return NextResponse.json({ page });
  } catch (err) {
    logger.error("[/api/wiki/pages/[slug] GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load page" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/wiki/pages/[slug]?circleId=<id>
// Body: { id, content, author, title?, ipfsHash? }
// Updates the page (creates a new version snapshot).
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
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

    // Resolve the page id from (circleId, slug) so callers only need the slug.
    const existing = await getPage(circleId, slug);
    if (!existing) return NextResponse.json({ error: "page not found" }, { status: 404 });

    const opts: UpdatePageOpts = {
      id: existing.id,
      content: String(body.content ?? ""),
      author: String(body.author || ""),
    };
    if (typeof body.title === "string") opts.title = body.title;
    if (typeof body.ipfsHash === "string") opts.ipfsHash = body.ipfsHash;

    const page = await updatePage(opts);
    return NextResponse.json({ ok: true, page });
  } catch (err) {
    logger.error("[/api/wiki/pages/[slug] PATCH] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update page" },
      { status: 500 },
    );
  }
}
