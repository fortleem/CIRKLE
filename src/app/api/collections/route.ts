/**
 * GET  /api/collections — list the caller's photo collections + moment albums.
 * POST /api/collections — create a new collection / moment album.
 * PATCH /api/collections — update an existing collection (add/remove posts, rename).
 * DELETE /api/collections?id=<id> — delete a collection.
 *
 * Query params (GET):
 *   • `user`   — owner handle (required, lowercase, no @).
 *   • `kind`   — optional filter: "collection" | "moment".
 *
 * Body (POST):
 *   • `user`          — owner handle (required).
 *   • `kind`          — "collection" (default) | "moment".
 *   • `title`         — required (≤140 chars).
 *   • `description?`  — optional (≤600 chars).
 *   • `postIds?`      — array of Post ids to seed the collection with.
 *   • `cover?`        — gradient class string for the cover.
 *   • `visibility?`   — "private" (default) | "shared" | "public".
 *   • `collaborators?` — array of handles (for "shared").
 *   • `category?`     — theme tag (Travel, Food, ...).
 *   • `pinned?`       — boolean.
 *
 * Body (PATCH):
 *   • `id`            — collection id (required).
 *   • `user`          — owner handle (required, must match).
 *   • Any of the POST fields (all optional).
 *   • `addPostIds?`   — array of Post ids to append.
 *   • `removePostIds?` — array of Post ids to remove.
 *
 * Privacy posture (§30.4): collections are keyed by owner handle — no
 * separate user id. The DELETE endpoint returns 404 for non-owned
 * collections so existence is not leaked. Public collections are
 * readable by anyone; private/shared require the owner handle.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const KINDS = new Set(["collection", "moment"]);
const VISIBILITIES = new Set(["private", "shared", "public"]);

interface PhotoCollectionRow {
  id: string;
  ownerLabel: string;
  kind: string;
  title: string;
  description: string | null;
  postIds: string;
  cover: string;
  visibility: string;
  collaborators: string;
  category: string | null;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function serialize(row: PhotoCollectionRow) {
  let postIds: string[] = [];
  try {
    const parsed = JSON.parse(row.postIds || "[]");
    if (Array.isArray(parsed)) postIds = parsed.filter((x): x is string => typeof x === "string");
  } catch { /* keep empty */ }
  let collaborators: string[] = [];
  try {
    const parsed = JSON.parse(row.collaborators || "[]");
    if (Array.isArray(parsed)) collaborators = parsed.filter((x): x is string => typeof x === "string");
  } catch { /* keep empty */ }
  return {
    id: row.id,
    ownerLabel: row.ownerLabel,
    kind: row.kind,
    title: row.title,
    description: row.description,
    postIds,
    cover: row.cover,
    visibility: row.visibility,
    collaborators,
    category: row.category,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/^@/, "");
  if (!s || s.length > 64) return null;
  return s;
}

function parseIdArray(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) {
      const id = x.trim();
      if (id.length <= 64) out.push(id);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/collections
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const user = normalizeHandle(sp.get("user"));
    if (!user) {
      return NextResponse.json({ error: "user is required" }, { status: 400 });
    }
    const kind = sp.get("kind") || undefined;
    if (kind && !KINDS.has(kind)) {
      return NextResponse.json({ error: `kind must be one of: ${Array.from(KINDS).join(", ")}` }, { status: 400 });
    }
    const includePublic = sp.get("includePublic") === "1";

    // Owner's own collections + (optionally) public ones they can see.
    const where = includePublic
      ? { OR: [{ ownerLabel: user }, { visibility: "public" }] }
      : { ownerLabel: user };
    const rows = await db.photoCollection.findMany({
      where: { ...where, ...(kind ? { kind } : {}) },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(
      { collections: rows.map(serialize) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error("[/api/collections GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to list collections" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/collections — create
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const user = normalizeHandle(body.user);
    if (!user) return NextResponse.json({ error: "user is required" }, { status: 400 });

    const kind = typeof body.kind === "string" && KINDS.has(body.kind) ? body.kind : "collection";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (title.length > 140) return NextResponse.json({ error: "title must be ≤140 chars" }, { status: 400 });

    const description = typeof body.description === "string" ? body.description.trim().slice(0, 600) : null;
    const postIds = parseIdArray(body.postIds) ?? [];
    const cover = typeof body.cover === "string" ? body.cover.trim().slice(0, 200) : "";
    const visibility = typeof body.visibility === "string" && VISIBILITIES.has(body.visibility)
      ? body.visibility
      : "private";
    const collaborators = parseIdArray(body.collaborators) ?? [];
    const category = typeof body.category === "string" ? body.category.trim().slice(0, 32) || null : null;
    const pinned = body.pinned === true;

    const row = await db.photoCollection.create({
      data: {
        ownerLabel: user,
        kind,
        title,
        description,
        postIds: JSON.stringify(postIds),
        cover,
        visibility,
        collaborators: JSON.stringify(collaborators),
        category,
        pinned,
      },
    });
    return NextResponse.json({ ok: true, collection: serialize(row) }, { status: 201 });
  } catch (err) {
    logger.error("[/api/collections POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to create collection" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/collections — update
// ─────────────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const user = normalizeHandle(body.user);
    if (!user) return NextResponse.json({ error: "user is required" }, { status: 400 });
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Ownership check — return 404 for non-owned so existence isn't leaked.
    const existing = await db.photoCollection.findUnique({ where: { id } });
    if (!existing || existing.ownerLabel !== user) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      if (t.length > 140) return NextResponse.json({ error: "title must be ≤140 chars" }, { status: 400 });
      data.title = t;
    }
    if (typeof body.description === "string") {
      data.description = body.description.trim().slice(0, 600);
    }
    if (typeof body.cover === "string") {
      data.cover = body.cover.trim().slice(0, 200);
    }
    if (typeof body.visibility === "string" && VISIBILITIES.has(body.visibility)) {
      data.visibility = body.visibility;
    }
    if (typeof body.category === "string") {
      data.category = body.category.trim().slice(0, 32) || null;
    }
    if (typeof body.pinned === "boolean") {
      data.pinned = body.pinned;
    }
    if (typeof body.kind === "string" && KINDS.has(body.kind)) {
      data.kind = body.kind;
    }
    if (Array.isArray(body.collaborators)) {
      const c = parseIdArray(body.collaborators) ?? [];
      data.collaborators = JSON.stringify(c);
    }

    // Post-id add/remove — read existing, mutate, write back.
    const addIds = parseIdArray(body.addPostIds) ?? [];
    const removeIds = new Set(parseIdArray(body.removePostIds) ?? []);
    if (addIds.length > 0 || removeIds.size > 0) {
      let current: string[] = [];
      try {
        const parsed = JSON.parse(existing.postIds || "[]");
        if (Array.isArray(parsed)) current = parsed.filter((x): x is string => typeof x === "string");
      } catch { /* keep empty */ }
      const set = new Set(current);
      for (const id of addIds) set.add(id);
      for (const id of removeIds) set.delete(id);
      data.postIds = JSON.stringify(Array.from(set));
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true, collection: serialize(existing) });
    }

    const updated = await db.photoCollection.update({ where: { id }, data });
    return NextResponse.json({ ok: true, collection: serialize(updated) });
  } catch (err) {
    logger.error("[/api/collections PATCH] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update collection" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/collections?id=<id>&user=<handle>
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const user = normalizeHandle(sp.get("user"));
    if (!user) return NextResponse.json({ error: "user is required" }, { status: 400 });
    const id = (sp.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Ownership check — return 404 for non-owned so existence isn't leaked.
    const existing = await db.photoCollection.findUnique({ where: { id } });
    if (!existing || existing.ownerLabel !== user) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await db.photoCollection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[/api/collections DELETE] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to delete collection" },
      { status: 500 },
    );
  }
}
