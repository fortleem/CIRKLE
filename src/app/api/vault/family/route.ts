import { NextRequest, NextResponse } from "next/server";
import { createFamily, listFamilies } from "@/lib/family-vault";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Family Vault — family list + create. Blueprint §26.6.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

/**
 * GET /api/vault/family?username=<handle>
 * Lists family vaults the user is a member of.
 */
export async function GET(req: NextRequest) {
  try {
    const username = normalizeUsername(req.nextUrl.searchParams.get("username"));
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    const families = await listFamilies(username);
    return NextResponse.json({ families });
  } catch (err) {
    logger.error("[/api/vault/family GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list families" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/vault/family
 * Body: { name: string, members: string[], createdBy: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name : "";
    const members = Array.isArray(body.members)
      ? (body.members as unknown[]).filter((o): o is string => typeof o === "string")
      : [];
    const createdBy = normalizeUsername(body.createdBy);
    if (!createdBy) return NextResponse.json({ error: "createdBy is required" }, { status: 400 });

    const family = await createFamily({ name, members, createdBy });
    return NextResponse.json({ family }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed to create family";
    logger.error("[/api/vault/family POST] error", { error: msg });
    const isUserError = msg.includes("must be") || msg.includes("required") || msg.includes("at most");
    return NextResponse.json({ error: msg }, { status: isUserError ? 400 : 500 });
  }
}
