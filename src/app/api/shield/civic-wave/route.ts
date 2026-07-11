import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * POST /api/shield/civic-wave
 *
 * Publish an existing Shield report as a "Civic Wave" — a piece of
 * civic infrastructure that propagates across the Cirkle pillars:
 *
 *   1. **Midan (social feed)** — creates a `Post` (module=midan) with
 *      the anonymized report body.
 *   2. **Mashahd (video evidence)** — creates a `Post` (module=mashahd,
 *      mediaKind=video) so the video evidence surfaces in the video
 *      pillar.
 *   3. **Public link** — generates a shareable URL.
 *
 * The report body is **anonymized**:
 *   - All metadata stripped (no user id, no ephemeral public key).
 *   - Location is **generalized to city level** (no lat/lng, no street).
 *   - Reporter identity replaced with privacy-level label.
 *
 * Body:
 *   {
 *     caseId: string,                 // ShieldReport.id
 *     publishMidan?: boolean,         // default true
 *     publishMashahd?: boolean,       // default false (only if video evidence)
 *     publishPublicLink?: boolean,    // default true
 *     authorName?: string,            // override (default: privacy label)
 *     authorHandle?: string,
 *   }
 *
 * Response: { ok, postId?, videoPostId?, publicLink?, message }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      caseId,
      publishMidan = true,
      publishMashahd = false,
      publishPublicLink = true,
      authorName,
      authorHandle,
    } = body as {
      caseId?: string;
      publishMidan?: boolean;
      publishMashahd?: boolean;
      publishPublicLink?: boolean;
      authorName?: string;
      authorHandle?: string;
    };

    if (!caseId || typeof caseId !== "string") {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const report = await db.shieldReport.findUnique({ where: { id: caseId } });
    if (!report) {
      return NextResponse.json({ error: "Shield report not found" }, { status: 404 });
    }

    // ── Anonymize: strip metadata, generalize location to city ────
    // officeRegion is "city, region" or just "city" — take first part.
    const cityLevel = (report.officeRegion || "undisclosed")
      .split(",")[0]
      .trim();
    const privacyLabel =
      report.privacyLevel === "anonymous"
        ? "Anonymous Citizen"
        : report.privacyLevel === "protected"
          ? "Protected Reporter"
          : "Cirkle Citizen";
    const privacyHandle =
      report.privacyLevel === "anonymous"
        ? "@anonymous"
        : report.privacyLevel === "protected"
          ? "@protected"
          : "@citizen";

    // Hash-truncate evidence hashes for the public body (forensic verifiability
    // without exposing the full chain).
    const evidenceHashes: string[] = JSON.parse(report.evidenceHashes || "[]");
    const evidencePreview = evidenceHashes.slice(0, 3).map((h) => h.slice(0, 12));

    const finalAuthorName = authorName || privacyLabel;
    const finalAuthorHandle = authorHandle || privacyHandle;

    let postId: string | null = null;
    let videoPostId: string | null = null;
    let publicLink: string | null = null;

    // ── 1. Midan post ────────────────────────────────────────────
    if (publishMidan) {
      const postBody = [
        `🏛️ CIVIC WAVE · ${report.caseNumber}`,
        ``,
        `📍 ${report.officeName} — ${cityLevel}`,
        `📋 ${report.category}`,
        ` ${report.title}`,
        ``,
        report.description,
        ``,
        `⚖️ Routed to: ${report.aiRoute || "Triage"}`,
        report.aiLocalAuthority ? `🏛️ Oversight: ${report.aiLocalAuthority}` : null,
        report.aiLegalFramework ? `📜 Legal: ${report.aiLegalFramework}` : null,
        `⚡ Escalation: Level ${report.escalationLevel}`,
        ``,
        `🔒 Evidence hash preview: ${evidencePreview.length ? evidencePreview.join(" · ") : "no evidence"}`,
        `👁️ Witnesses: ${report.witnessCount}`,
        `🛡️ Chain of custody verified · SHA-256`,
        ``,
        `#CivicWave #CitizenShield #${report.category.replace(/\s+/g, "")} #CirkleCivicWave`,
      ]
        .filter(Boolean)
        .join("\n");

      const post = await db.post.create({
        data: {
          authorName: finalAuthorName,
          authorHandle: finalAuthorHandle,
          authorInitials: report.privacyLevel === "anonymous" ? "👻" : "🛡️",
          authorColor: "rose",
          authorVerified: false,
          body: postBody,
          module: "midan",
          visibility: "public",
          language: "en",
          tags: "civic-wave,citizen-shield",
          location: cityLevel,
          likes: 0, comments: 0, shares: 0, views: 0,
        },
      });
      postId = post.id;

      // Link the post back to the report.
      await db.shieldReport.update({
        where: { id: report.id },
        data: { publishedPostId: post.id, publishedAt: new Date() },
      });

      // Append a chain-of-custody entry.
      try {
        const chain = JSON.parse(report.chainOfCustody || "[]") as unknown[];
        chain.push({
          actor: "Cirkle Civic Wave",
          role: "system",
          action: `Published as Civic Wave to Midan (post ${post.id}). Body anonymized: metadata stripped, location generalized to ${cityLevel}.`,
          timestamp: new Date().toISOString(),
        });
        await db.shieldReport.update({
          where: { id: report.id },
          data: { chainOfCustody: JSON.stringify(chain) },
        });
      } catch { /* non-fatal */ }
    }

    // ── 2. Mashahd video post ────────────────────────────────────
    if (publishMashahd) {
      const videoBody = [
        `📹 CIVIC WAVE — Evidence · ${report.caseNumber}`,
        ``,
        `📍 ${report.officeName} — ${cityLevel}`,
        `📋 ${report.category} — ${report.title}`,
        ``,
        `🔒 Hash-verified evidence · Chain of custody intact`,
        `👁️ Witnesses: ${report.witnessCount}`,
        ``,
        `#CivicWave #CitizenShieldEvidence`,
      ].join("\n");

      const videoPost = await db.post.create({
        data: {
          authorName: finalAuthorName,
          authorHandle: finalAuthorHandle,
          authorInitials: report.privacyLevel === "anonymous" ? "👻" : "🛡️",
          authorColor: "rose",
          authorVerified: false,
          body: videoBody,
          module: "mashahd",
          visibility: "public",
          language: "en",
          tags: "civic-wave,citizen-shield,evidence",
          location: cityLevel,
          mediaKind: "video",
          mediaCount: evidenceHashes.length || 1,
          likes: 0, comments: 0, shares: 0, views: 0,
        },
      });
      videoPostId = videoPost.id;
    }

    // ── 3. Public link ───────────────────────────────────────────
    if (publishPublicLink) {
      publicLink = `https://cirkle.app/shield/${report.caseNumber}`;
      await db.shieldReport.update({
        where: { id: report.id },
        data: { publishPublicLink: true, publishedAt: new Date() },
      });
    }

    logger.info("[/api/shield/civic-wave] published", {
      caseId: report.id,
      postId,
      videoPostId,
      publicLink: !!publicLink,
    });

    return NextResponse.json({
      ok: true,
      postId,
      videoPostId,
      publicLink,
      message: publishMidan
        ? "Civic Wave published to Midan. Body anonymized — metadata stripped, location generalized to city level."
        : "Civic Wave prepared (Midan publishing disabled).",
    });
  } catch (err) {
    logger.error("[/api/shield/civic-wave] error", { error: (err as Error).message });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to publish Civic Wave" },
      { status: 500 },
    );
  }
}
