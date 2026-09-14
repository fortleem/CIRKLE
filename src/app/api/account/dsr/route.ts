import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/account/dsr
 *
 * Logs a Data Subject Request (GDPR Art. 15–21 / PDPL / CCPA).
 *
 * Body: { username: string, type: "access"|"correction"|"deletion"|"portability"|"objection", details?: string }
 *
 * Returns: { ok: true, id, status: "pending" }
 *
 * The DPO is expected to triage the `DataSubjectRequest` table and respond
 * within 30 days (GDPR Article 12).
 */
const VALID_TYPES = new Set([
  "access",
  "correction",
  "deletion",
  "portability",
  "objection",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.username || "").trim().toLowerCase().replace(/@cirkle$/i, "").replace(/^@/, "");
    const type = String(body?.type || "").trim().toLowerCase();
    const details = body?.details ? String(body.details).trim().slice(0, 4000) : null;

    if (!username) {
      return NextResponse.json(
        { ok: false, error: "Missing username." },
        { status: 400 },
      );
    }
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { ok: false, error: `Invalid type. Must be one of: ${Array.from(VALID_TYPES).join(", ")}.` },
        { status: 400 },
      );
    }

    const record = await db.dataSubjectRequest.create({
      data: {
        username,
        type,
        details,
        status: "pending",
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      id: record.id,
      status: record.status,
      createdAt: record.createdAt,
    });
  } catch (err) {
    console.error("[account/dsr] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to submit request.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/account/dsr?username=foo
 *
 * Lists the user's submitted DSRs so they can track status.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const username = (url.searchParams.get("username") || "").trim().toLowerCase().replace(/@cirkle$/i, "").replace(/^@/, "");

    if (!username) {
      return NextResponse.json(
        { ok: false, error: "Missing username." },
        { status: 400 },
      );
    }

    const records = await db.dataSubjectRequest.findMany({
      where: { username },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ ok: true, requests: records });
  } catch (err) {
    console.error("[account/dsr] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch requests.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}
