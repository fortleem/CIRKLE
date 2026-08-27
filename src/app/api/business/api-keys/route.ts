// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { createApiKey, getApiUsage, revokeApiKey } from "@/lib/business-api";
import { logger } from "@/lib/logger";

/**
 * GET /api/business/api-keys?institutionId=...
 * Lists all API keys + total usage for an institution.
 */
export async function GET(req: NextRequest) {
  try {
    const institutionId = req.nextUrl.searchParams.get("institutionId") || "";
    if (!institutionId) {
      return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
    }
    const usage = await getApiUsage(institutionId);
    // Don't leak keyHashes in the response
    const keys = usage.keys.map((k: any) => ({
      id: k.id,
      label: k.label,
      rateLimitPerMin: k.rateLimitPerMin,
      totalCalls: k.totalCalls,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      revokedAt: k.revokedAt,
      keyPreview: "ck_live_••••••••",
    }));
    return NextResponse.json({ keys, totalCalls: usage.totalCalls, activeKeys: usage.activeKeys });
  } catch (err) {
    logger.error("[/api/business/api-keys GET]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list api keys" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/business/api-keys
 * Body: { institutionId, label, rateLimitPerMin? } OR { revokeId }
 * - With `revokeId`: revokes the key.
 * - Otherwise: creates a new key.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
    if (typeof body.revokeId === "string" && body.revokeId) {
      const revoked = await revokeApiKey(body.revokeId);
      if (!revoked) return NextResponse.json({ error: "key not found" }, { status: 404 });
      logger.info("[/api/business/api-keys POST] revoked", { id: revoked.id });
      return NextResponse.json({ apiKey: revoked });
    }
    const result = await createApiKey({
      institutionId: typeof body.institutionId === "string" ? body.institutionId : "",
      label: typeof body.label === "string" ? body.label : "",
      rateLimitPerMin: typeof body.rateLimitPerMin === "number" ? body.rateLimitPerMin : 60,
    });
    logger.info("[/api/business/api-keys POST] created", { id: result.apiKey.id, label: result.apiKey.label });
    return NextResponse.json({ apiKey: result.apiKey, plaintext: result.plaintext }, { status: 201 });
  } catch (err) {
    logger.error("[/api/business/api-keys POST]", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create api key" },
      { status: 500 },
    );
  }
}
