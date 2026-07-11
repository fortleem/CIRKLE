import { NextRequest, NextResponse } from "next/server";
import {
  canonicalAgreementContent,
  commitHash,
  lookupHash,
  verifyHash,
} from "@/lib/commit-hash";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit · U9 — On-Chain Agreement Hash API (Proof of Existence)
//   POST → commit a hash for the supplied agreement content
//   GET  → verify a hash (query: ?hash=...&content=...)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      title = "",
      description = "",
      parties = [],
      amount = 0,
      currency = "SAR",
      deadline = "",
      conditions = [],
      content,
    } = body as Record<string, unknown>;

    // If the caller supplied a pre-serialized `content` string, hash that
    // directly. Otherwise, build the canonical form from the structured
    // fields so the hash is reproducible on both sides.
    let agreementContent: string;
    if (typeof content === "string" && content.trim()) {
      agreementContent = content;
    } else {
      const safeParties = Array.isArray(parties)
        ? parties
            .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
            .map((p) => ({
              name: typeof p.name === "string" ? p.name : "",
              signed: Boolean(p.signed),
            }))
        : [];
      const safeConditions = Array.isArray(conditions)
        ? conditions.filter((c): c is string => typeof c === "string")
        : [];
      agreementContent = canonicalAgreementContent({
        title: typeof title === "string" ? title : "",
        description: typeof description === "string" ? description : "",
        parties: safeParties,
        amount: typeof amount === "number" ? amount : 0,
        currency: typeof currency === "string" ? currency : "SAR",
        deadline: typeof deadline === "string" ? deadline : "",
        conditions: safeConditions,
      });
    }

    const result = await commitHash(agreementContent);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to commit hash", details: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hash = url.searchParams.get("hash");
    const content = url.searchParams.get("content");

    if (!hash) {
      return NextResponse.json({ error: "hash query param is required" }, { status: 400 });
    }

    // If content is supplied, do a full re-hash + ledger check.
    if (content) {
      const verified = await verifyHash(content, hash);
      return NextResponse.json({ hash, verified, checkedAt: new Date().toISOString() });
    }

    // Otherwise just look up ledger metadata.
    const meta = await lookupHash(hash);
    if (!meta) {
      return NextResponse.json({ hash, verified: false, message: "Hash not found in ledger" }, { status: 404 });
    }
    return NextResponse.json({ ...meta, checkedAt: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: "Failed to verify hash", details: String(err) }, { status: 500 });
  }
}
