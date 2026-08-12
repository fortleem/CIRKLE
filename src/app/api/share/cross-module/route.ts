import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  executeCrossModuleShare,
  getShareSuggestions,
  type ModuleId,
  type ShareContent,
  type ShareResponse,
} from "@/lib/cross-module-share";

// ─────────────────────────────────────────────────────────────────────────────
// Cross-Module Sharing Hub — Task CREATIVE-1, Feature #5.
//
//   POST /api/share/cross-module
//     Body: { content: ShareContent, modules: ModuleId[], username?: string }
//     Returns: ShareResponse — per-module results + AI suggestions + timing.
//
// Each module's payload is dispatched in parallel so a slow module doesn't
// block the others. Failures in any single module do not abort the others —
// we collect per-module results and return them.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

const VALID_MODULES: ModuleId[] = ["midan", "lamahat", "mashahd", "wasl"];

interface RequestBody {
  content: ShareContent;
  modules: ModuleId[];
  username?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const { content, modules } = body;

    // ── Validate content ──────────────────────────────────────────────
    if (!content || typeof content !== "object") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    if (typeof content.text !== "string" || content.text.trim().length === 0) {
      // Allow shares that are photo/video only — but require SOMETHING.
      const hasPhoto = Array.isArray(content.photos) && content.photos.length > 0;
      const hasVideo = typeof content.video === "string" && content.video.length > 0;
      if (!hasPhoto && !hasVideo) {
        return NextResponse.json(
          { error: "content.text is required (or at least one photo/video)" },
          { status: 400 },
        );
      }
    }
    if (content.text && content.text.length > 20_000) {
      return NextResponse.json(
        { error: "content.text is too long (max 20,000 chars)" },
        { status: 400 },
      );
    }

    // ── Validate modules ──────────────────────────────────────────────
    if (!Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json(
        { error: "modules must be a non-empty array" },
        { status: 400 },
      );
    }
    const cleanModules = modules.filter(
      (m): m is ModuleId => typeof m === "string" && VALID_MODULES.includes(m as ModuleId),
    );
    // Dedupe while preserving order.
    const uniqueModules = Array.from(new Set(cleanModules));
    if (uniqueModules.length === 0) {
      return NextResponse.json(
        { error: "modules must contain at least one valid module id" },
        { status: 400 },
      );
    }

    // ── Username ──────────────────────────────────────────────────────
    const username =
      typeof body.username === "string" && body.username.trim()
        ? body.username.trim().toLowerCase().replace(/^@/, "")
        : (req.headers.get("x-cirkle-username") || "anonymous").toLowerCase().replace(/^@/, "");

    // ── Execute the share ─────────────────────────────────────────────
    const result: ShareResponse = await executeCrossModuleShare(
      {
        text: content.text ?? "",
        photos: Array.isArray(content.photos) ? content.photos : undefined,
        video: typeof content.video === "string" ? content.video : undefined,
        caption: typeof content.caption === "string" ? content.caption : undefined,
        hashtags: Array.isArray(content.hashtags) ? content.hashtags : undefined,
        link: typeof content.link === "string" ? content.link : undefined,
        privacy: content.privacy ?? "public",
      },
      uniqueModules,
      username,
    );

    logger.info("[/api/share/cross-module] share dispatched", {
      username,
      modules: uniqueModules,
      okCount: result.results.filter((r) => r.ok).length,
      elapsedMs: result.elapsedMs,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error("[/api/share/cross-module POST] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to share" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/share/cross-module
 * Returns the module metadata + a sample suggestions payload so the client
 * can render the share hub UI without making a POST first.
 */
export async function GET() {
  return NextResponse.json({
    modules: VALID_MODULES,
    suggestions: getShareSuggestions({
      text: "Sample post about a beautiful sunset over the Nile.",
      photos: ["https://example.com/sunset.jpg"],
      hashtags: ["cairo", "sunset"],
    }),
  });
}
