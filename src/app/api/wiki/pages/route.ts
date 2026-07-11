import { NextRequest, NextResponse } from "next/server";
import { createPage, listPages, deletePage } from "@/lib/knowledge-wiki";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wiki/pages?circleId=<id>
// Lists all pages in a Circle, newest update first.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const circleId = req.nextUrl.searchParams.get("circleId");
    if (!circleId) {
      return NextResponse.json({ error: "circleId is required" }, { status: 400 });
    }
    const pages = await listPages(circleId);
    return NextResponse.json({ pages });
  } catch (err) {
    logger.error("[/api/wiki/pages GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list pages" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wiki/pages
// Body: { circleId, slug, title, content, author, ipfsHash? }
// Creates a new page (and its initial version 1).
//
// DELETE intent: { action: "delete", id } — kept on this route because
// DELETE requests with bodies are awkward across proxies.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    if (body.action === "delete") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
      const ok = await deletePage(id);
      return NextResponse.json({ ok });
    }

    const page = await createPage({
      circleId: String(body.circleId || ""),
      slug: String(body.slug || ""),
      title: String(body.title || ""),
      content: String(body.content || ""),
      author: String(body.author || ""),
      ipfsHash: typeof body.ipfsHash === "string" ? body.ipfsHash : null,
    });
    return NextResponse.json({ ok: true, page }, { status: 201 });
  } catch (err) {
    logger.error("[/api/wiki/pages POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create page" },
      { status: 500 },
    );
  }
}
