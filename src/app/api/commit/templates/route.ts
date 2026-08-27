// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getTemplates, instantiateTemplate } from "@/lib/commit-premium-templates";
import { logger } from "@/lib/logger";

/**
 * GET /api/commit/templates?category=nda|employment|lease|freelance|partnership|sale
 * Returns the list of commit templates (free + premium).
 */
export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category") as any | null;
    const list = await getTemplates(category || undefined);
    return NextResponse.json({ templates: list });
  } catch (err) {
    logger.error("[/api/commit/templates GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list templates" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/commit/templates
 * Body: { templateId, values: { partyA: "...", partyB: "...", ... } }
 * Instantiates a template by substituting the {{placeholders}}.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const values =
      body.values && typeof body.values === "object"
        ? (body.values as Record<string, string>)
        : {};
    if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    const inst = await instantiateTemplate({ templateId, values });
    logger.info("[/api/commit/templates POST] instantiated", { templateId, id: inst.id });
    return NextResponse.json({ instantiation: inst }, { status: 201 });
  } catch (err) {
    logger.error("[/api/commit/templates POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to instantiate template" },
      { status: 500 },
    );
  }
}
