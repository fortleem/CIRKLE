// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import {
  listPremiumTemplates,
  getPremiumTemplate,
  getTemplatePreview,
  purchaseTemplate,
  refundPurchase,
  listUserPurchases,
  rateTemplate,
  listReviews,
  getRating,
  listBundles,
  createBundle,
  getCreatorRevenue,
} from "@/lib/commit-templates-plus";
import { logger } from "@/lib/logger";
import type { TemplateCategory } from "@/lib/commit-templates";

/**
 * GET /api/commit/templates-plus
 * Query params:
 *   ?category=...          → filter by category
 *   ?bestseller=1          → bestsellers only
 *   ?bundles=1             → return bundles instead of templates
 *   ?userId=...&purchases=1 → user's purchase history
 *   ?templateId=...&preview=1&userId=... → template preview (respects purchase state)
 *   ?templateId=...&reviews=1 → list reviews for a template
 *   ?templateId=...&rating=1 → just the rating summary
 *   ?creatorId=...&revenue=1 → creator revenue roll-up
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const userId = sp.get("userId") || "";
    const templateId = sp.get("templateId") || "";
    const creatorId = sp.get("creatorId") || "";

    if (sp.get("bundles") === "1") {
      const bundles = await listBundles();
      return NextResponse.json({ bundles });
    }
    if (sp.get("purchases") === "1" && userId) {
      const purchases = await listUserPurchases(userId);
      return NextResponse.json({ purchases, total: purchases.length });
    }
    if (sp.get("preview") === "1" && templateId && userId) {
      const preview = await getTemplatePreview(templateId, userId);
      return NextResponse.json(preview);
    }
    if (sp.get("reviews") === "1" && templateId) {
      const reviews = await listReviews(templateId);
      const rating = await getRating(templateId);
      return NextResponse.json({ reviews, rating });
    }
    if (sp.get("rating") === "1" && templateId) {
      const rating = await getRating(templateId);
      return NextResponse.json({ rating });
    }
    if (sp.get("revenue") === "1" && creatorId) {
      const revenue = await getCreatorRevenue(creatorId);
      return NextResponse.json({ revenue });
    }
    if (templateId) {
      const t = await getPremiumTemplate(templateId);
      if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ template: t });
    }

    const category = (sp.get("category") as TemplateCategory | null) || undefined;
    const bestsellerOnly = sp.get("bestseller") === "1";
    const templates = await listPremiumTemplates({ category, bestsellerOnly });
    const bundles = await listBundles();
    return NextResponse.json({ templates, bundles, total: templates.length });
  } catch (err) {
    logger.error("[/api/commit/templates-plus GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/commit/templates-plus
 * Body:
 *   { action: 'purchase', templateId, userId, method? }
 *   { action: 'refund',   purchaseId }
 *   { action: 'rate',     templateId, userId, rating, comment }
 *   { action: 'createBundle', name, description, templateIds[], priceUsd, emoji? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "purchase") {
      const templateId = typeof body.templateId === "string" ? body.templateId : "";
      const userId = typeof body.userId === "string" ? body.userId : "";
      const method = (body.method as "card" | "wallet" | "bank_transfer") || "card";
      if (!templateId || !userId) {
        return NextResponse.json({ error: "templateId + userId required" }, { status: 400 });
      }
      const purchase = await purchaseTemplate({ templateId, userId, method });
      return NextResponse.json({ purchase }, { status: 201 });
    }

    if (action === "refund") {
      const pid = typeof body.purchaseId === "string" ? body.purchaseId : "";
      if (!pid) return NextResponse.json({ error: "purchaseId required" }, { status: 400 });
      const purchase = await refundPurchase(pid);
      return NextResponse.json({ purchase });
    }

    if (action === "rate") {
      const templateId = typeof body.templateId === "string" ? body.templateId : "";
      const userId = typeof body.userId === "string" ? body.userId : "";
      const rating = typeof body.rating === "number" ? body.rating : 0;
      const comment = typeof body.comment === "string" ? body.comment : "";
      if (!templateId || !userId) {
        return NextResponse.json({ error: "templateId + userId required" }, { status: 400 });
      }
      const review = await rateTemplate(templateId, userId, rating, comment);
      return NextResponse.json({ review }, { status: 201 });
    }

    if (action === "createBundle") {
      const name = typeof body.name === "string" ? body.name : "";
      const description = typeof body.description === "string" ? body.description : "";
      const templateIds = Array.isArray(body.templateIds) ? body.templateIds as string[] : [];
      const priceUsd = typeof body.priceUsd === "number" ? body.priceUsd : 0;
      const emoji = typeof body.emoji === "string" ? body.emoji : undefined;
      if (!name || templateIds.length < 2) {
        return NextResponse.json({ error: "name + at least 2 templateIds required" }, { status: 400 });
      }
      const bundle = await createBundle({ name, description, templateIds, priceUsd, emoji });
      return NextResponse.json({ bundle }, { status: 201 });
    }

    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    logger.error("[/api/commit/templates-plus POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to mutate" },
      { status: 500 },
    );
  }
}
