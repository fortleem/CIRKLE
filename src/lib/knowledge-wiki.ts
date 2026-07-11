/**
 * Knowledge Wiki — Blueprint §10.5.5, §26.4.
 *
 * Server-only library powering IPFS-backed Markdown wikis inside any Circle.
 * Each page is versioned — every update creates a new `WikiPageVersion` row
 * so the full history is preserved and diffs are queryable.
 *
 * The interface lives in `src/components/overlays/knowledge-wiki.tsx`.
 * API routes live under `src/app/api/wiki/`.
 *
 * Slug rules: lowercase, alphanumerics + hyphens, 1–80 chars. The slug is
 * unique within a Circle (`@@unique([circleId, slug])`).
 */

import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WikiPage {
  id: string;
  circleId: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  version: number;
  ipfsHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WikiPageVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  content: string;
  author: string;
  ipfsHash: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

function normalizeSlug(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (!SLUG_RE.test(s)) return null;
  return s;
}

function normalizeAuthor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toLowerCase().replace(/^@/, "");
  if (!u || u.length > 64) return null;
  return u;
}

function toIso(d: Date): string {
  return d.toISOString();
}

function serializePage(row: {
  id: string;
  circleId: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  version: number;
  ipfsHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WikiPage {
  return {
    id: row.id,
    circleId: row.circleId,
    slug: row.slug,
    title: row.title,
    content: row.content,
    author: row.author,
    version: row.version,
    ipfsHash: row.ipfsHash,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function serializeVersion(row: {
  id: string;
  pageId: string;
  version: number;
  title: string;
  content: string;
  author: string;
  ipfsHash: string | null;
  createdAt: Date;
}): WikiPageVersion {
  return {
    id: row.id,
    pageId: row.pageId,
    version: row.version,
    title: row.title,
    content: row.content,
    author: row.author,
    ipfsHash: row.ipfsHash,
    createdAt: toIso(row.createdAt),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePageOpts {
  circleId: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  ipfsHash?: string | null;
}

/**
 * Create a new wiki page in a Circle.
 * Also creates the initial WikiPageVersion (version 1).
 */
export async function createPage(opts: CreatePageOpts): Promise<WikiPage> {
  if (typeof opts.circleId !== "string" || !opts.circleId) {
    throw new Error("circleId is required");
  }
  const slug = normalizeSlug(opts.slug);
  if (!slug) throw new Error("slug must be lowercase alphanumerics + hyphens (1–80 chars)");
  if (typeof opts.title !== "string" || !opts.title.trim() || opts.title.length > 200) {
    throw new Error("title is required (≤200 chars)");
  }
  if (typeof opts.content !== "string" || opts.content.length > 200000) {
    throw new Error("content too long (≤200000 chars)");
  }
  const author = normalizeAuthor(opts.author);
  if (!author) throw new Error("author is required");
  const ipfsHash =
    typeof opts.ipfsHash === "string" && opts.ipfsHash.length <= 128 ? opts.ipfsHash : null;

  // Check uniqueness.
  const existing = await db.wikiPage.findUnique({
    where: { circleId_slug: { circleId: opts.circleId, slug } },
  });
  if (existing) throw new Error("a page with that slug already exists in this circle");

  const page = await db.wikiPage.create({
    data: {
      circleId: opts.circleId,
      slug,
      title: opts.title.trim(),
      content: opts.content,
      author,
      version: 1,
      ipfsHash,
      versions: {
        create: {
          version: 1,
          title: opts.title.trim(),
          content: opts.content,
          author,
          ipfsHash,
        },
      },
    },
  });
  logger.info("[wiki] page created", { id: page.id, circleId: opts.circleId, slug });
  return serializePage(page);
}

/**
 * Get a single page by (circleId, slug).
 */
export async function getPage(circleId: string, slug: string): Promise<WikiPage | null> {
  if (typeof circleId !== "string" || !circleId) return null;
  const s = normalizeSlug(slug);
  if (!s) return null;
  const row = await db.wikiPage.findUnique({
    where: { circleId_slug: { circleId, slug: s } },
  });
  return row ? serializePage(row) : null;
}

export interface UpdatePageOpts {
  id: string;
  content: string;
  author: string;
  title?: string; // optional title change
  ipfsHash?: string | null;
}

/**
 * Update a wiki page. Increments version, snapshots the new content into
 * WikiPageVersion, and updates the page's title/content/updatedAt.
 *
 * If the new content + title are identical to the current page, this is a
 * no-op (returns the existing page without bumping version).
 */
export async function updatePage(opts: UpdatePageOpts): Promise<WikiPage> {
  if (typeof opts.id !== "string" || !opts.id) throw new Error("id is required");
  const author = normalizeAuthor(opts.author);
  if (!author) throw new Error("author is required");
  if (typeof opts.content !== "string" || opts.content.length > 200000) {
    throw new Error("content too long (≤200000 chars)");
  }
  const title =
    typeof opts.title === "string" && opts.title.trim()
      ? opts.title.trim().slice(0, 200)
      : undefined;
  const ipfsHash =
    typeof opts.ipfsHash === "string" && opts.ipfsHash.length <= 128 ? opts.ipfsHash : null;

  const current = await db.wikiPage.findUnique({ where: { id: opts.id } });
  if (!current) throw new Error("page not found");

  const newTitle = title ?? current.title;
  const newContent = opts.content;
  const newIpfsHash = ipfsHash;

  // No-op if nothing changed.
  if (
    newTitle === current.title &&
    newContent === current.content &&
    newIpfsHash === current.ipfsHash
  ) {
    return serializePage(current);
  }

  const nextVersion = current.version + 1;

  // Update page + push new version row in a single transaction.
  const [updated] = await db.$transaction([
    db.wikiPage.update({
      where: { id: opts.id },
      data: {
        title: newTitle,
        content: newContent,
        author,
        version: nextVersion,
        ipfsHash: newIpfsHash,
      },
    }),
    db.wikiPageVersion.create({
      data: {
        pageId: opts.id,
        version: nextVersion,
        title: newTitle,
        content: newContent,
        author,
        ipfsHash: newIpfsHash,
      },
    }),
  ]);
  logger.info("[wiki] page updated", { id: opts.id, version: nextVersion });
  return serializePage(updated);
}

/**
 * List all pages in a Circle, newest update first.
 */
export async function listPages(circleId: string): Promise<WikiPage[]> {
  if (typeof circleId !== "string" || !circleId) return [];
  const rows = await db.wikiPage.findMany({
    where: { circleId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(serializePage);
}

/**
 * Get the full version history of a page (oldest first).
 * Returns WikiPageVersion[] — each row has its own title/content snapshot.
 */
export async function getPageHistory(id: string): Promise<WikiPageVersion[]> {
  if (typeof id !== "string" || !id) return [];
  const rows = await db.wikiPageVersion.findMany({
    where: { pageId: id },
    orderBy: { version: "asc" },
  });
  return rows.map(serializeVersion);
}

/**
 * Restore a previous version: snapshots the old content as a NEW version
 * (so history always moves forward — no destructive edits).
 */
export async function restoreVersion(pageId: string, version: number, author: string): Promise<WikiPage> {
  if (typeof pageId !== "string" || !pageId) throw new Error("pageId is required");
  const v = Number(version);
  if (!isFinite(v) || v < 1) throw new Error("version must be a positive integer");
  const a = normalizeAuthor(author);
  if (!a) throw new Error("author is required");

  const target = await db.wikiPageVersion.findUnique({
    where: { pageId_version: { pageId, version: v } },
  });
  if (!target) throw new Error(`version ${v} not found`);

  return updatePage({
    id: pageId,
    content: target.content,
    title: target.title,
    author: a,
    ipfsHash: target.ipfsHash,
  });
}

/**
 * Delete a page (and all its versions, cascaded).
 * Returns true if a row was deleted, false if the page didn't exist.
 */
export async function deletePage(id: string): Promise<boolean> {
  if (typeof id !== "string" || !id) return false;
  try {
    await db.wikiPage.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
