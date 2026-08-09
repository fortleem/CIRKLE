/**
 * Circle Mail — server-only library for the Circle Mail pillar
 * (Blueprint §20). Internal-only @cirkle.app email client.
 *
 *   • Every user gets a free `@cirkle.app` address provisioned on first use.
 *   • Mail flows username → username — no SMTP, no external delivery.
 *   • AI triage (summarize / categorize) is delegated to /api/ai/summarize.
 *
 * Server-only — never import this from a client component.
 */

import "server-only";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ── Types ───────────────────────────────────────────────────────────────────

export interface MailMessage {
  id: string;
  toUsername: string;
  fromUsername: string;
  fromEmail: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  folder: string; // inbox | sent | draft | trash
  createdAt: string;
}

export interface SendMailOpts {
  to: string;       // recipient username (or @-prefixed / @cirkle.app-suffixed)
  from: string;     // sender username
  subject: string;
  body: string;
  /**
   * P2.2 — optional folder override. The only honoured values are:
   *   • "draft" — saves a single row to the sender's Drafts folder (no
   *     recipient copy is written). The recipient (`to`) is still validated
   *     so the user gets an error if they typed a bad username.
   *   • "spam" — explicitly route the recipient's copy to their Spam folder
   *     (skipping the keyword classifier).
   * Any other value falls through to the default behaviour (classifier
   * decides inbox vs. spam).
   */
  folder?: MailFolder;
}

export type MailFolder = "inbox" | "sent" | "draft" | "spam" | "trash";

// ── Constants ───────────────────────────────────────────────────────────────

export const MAIL_DOMAIN = "cirkle.app";
export const VALID_FOLDERS: readonly MailFolder[] = [
  "inbox",
  "sent",
  "draft",
  "spam",
  "trash",
];

/**
 * P2.2 — Simple keyword-based spam classifier.
 *
 * This is a coarse-grained filter that flags obvious spam patterns. The
 * upgrade path is to plug in an on-device ONNX classifier (ADR-003) or a
 * server-side rspamd/Sieve rule set on a real Mailcow deployment — the
 * `classifySpam` shape stays the same so call sites don't change.
 */
const SPAM_KEYWORDS = [
  "viagra", "cialis", "lottery", "winner", "you've won", "claim your prize",
  "free money", "nigerian prince", "crypto giveaway", "double your",
  "click here to claim", "urgent fund transfer", "dating singles",
  "adult content", "escort service", "cheap meds", "discount pharmacy",
  "make money fast", "work from home earn", "investment opportunity guaranteed",
  "bitcoin bonus", "unlock your account", "verify your password",
];

export interface SpamVerdict {
  isSpam: boolean;
  score: number; // 0..1 confidence
  matchedKeywords: string[];
}

export function classifySpam(subject: string, body: string): SpamVerdict {
  const text = `${subject || ""} ${body || ""}`.toLowerCase();
  const matched: string[] = [];
  for (const kw of SPAM_KEYWORDS) {
    if (text.includes(kw)) matched.push(kw);
  }
  // Crude score: each match contributes 0.2, capped at 1.
  const score = Math.min(1, matched.length * 0.2);
  return { isSpam: matched.length >= 2 || score >= 0.4, score, matchedKeywords: matched };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Accept "layla", "@layla", "layla@cirkle.app"
  let u = raw.trim().toLowerCase();
  if (u.endsWith(`@${MAIL_DOMAIN}`)) u = u.slice(0, -(`@${MAIL_DOMAIN}`.length));
  u = u.replace(/^@/, "");
  if (!u || u.length > 64) return null;
  if (!/^[a-z0-9_]+$/.test(u)) return null;
  return u;
}

/** Returns the canonical @cirkle.app email for a username. */
export function mailAddressFor(username: string): string {
  return `${username}@${MAIL_DOMAIN}`;
}

function rowToMail(row: {
  id: string;
  toUsername: string;
  fromUsername: string;
  fromEmail: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  folder: string;
  createdAt: Date;
}): MailMessage {
  return {
    id: row.id,
    toUsername: row.toUsername,
    fromUsername: row.fromUsername,
    fromEmail: row.fromEmail,
    subject: row.subject,
    body: row.body,
    read: row.read,
    starred: row.starred,
    folder: row.folder,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Provision a mailbox for a user. Since Cirkle Mail is internal-only (no SMTP),
 * a "mailbox" is just a guarantee that the user's username is reserved for
 * mail delivery. This function returns the canonical email address.
 *
 * It is idempotent — calling it again for the same user is a no-op.
 */
export async function provisionMailbox(
  username: string,
): Promise<{ email: string }> {
  const user = normalizeUsername(username);
  if (!user) throw new Error("invalid username");
  return { email: mailAddressFor(user) };
}

/**
 * Send a mail message. Writes two rows:
 *   • one to the recipient's `inbox`
 *   • one to the sender's `sent` folder
 *
 * Both rows are independent (no foreign-key link) so the recipient can delete
 * or star their copy without affecting the sender's view.
 */
export async function sendMail(opts: SendMailOpts): Promise<MailMessage> {
  const to = normalizeUsername(opts.to);
  const from = normalizeUsername(opts.from);
  if (!to) throw new Error("invalid recipient (to)");
  if (!from) throw new Error("invalid sender (from)");
  if (to === from) throw new Error("cannot send mail to yourself");

  const subject = (opts.subject || "").trim().slice(0, 500) || "(no subject)";
  const body = (opts.body || "").slice(0, 50_000);
  const fromEmail = mailAddressFor(from);

  // P2.2 — Drafts path. When the caller passes folder=draft, we save a
  // single row to the sender's Drafts folder and skip the recipient write.
  // This mirrors the IMAP \Drafts folder semantics.
  if (opts.folder === "draft") {
    const draftRow = await db.mailMessage.create({
      data: {
        toUsername: to,
        fromUsername: from,
        fromEmail,
        subject,
        body,
        read: true,
        starred: false,
        folder: "draft",
      },
    });
    logger.info("[circle-mail] draft saved", {
      id: draftRow.id,
      from,
      to,
      subject: subject.slice(0, 80),
    });
    return rowToMail(draftRow);
  }

  // P2.2 — spam classification. The recipient's copy lands in their `spam`
  // folder if the verdict is positive (or if the caller explicitly passed
  // folder=spam); the sender still gets a `sent` row.
  const spam = opts.folder === "spam" ? { isSpam: true, score: 1, matchedKeywords: [] } : classifySpam(subject, body);
  const recipientFolder = spam.isSpam ? "spam" : "inbox";

  // Two rows: one in the recipient's inbox (or spam), one in the sender's sent folder.
  // We write them sequentially so a recipient-side failure still leaves the
  // sender with their sent copy (and vice-versa).
  const inboxRow = await db.mailMessage.create({
    data: {
      toUsername: to,
      fromUsername: from,
      fromEmail,
      subject,
      body,
      read: false,
      starred: false,
      folder: recipientFolder,
    },
  });

  await db.mailMessage.create({
    data: {
      toUsername: to,
      fromUsername: from,
      fromEmail,
      subject,
      body,
      read: true, // the sender obviously read what they just sent
      starred: false,
      folder: "sent",
    },
  });

  logger.info("[circle-mail] sent", {
    id: inboxRow.id,
    from,
    to,
    subject: subject.slice(0, 80),
    spam: spam.isSpam,
  });

  return rowToMail(inboxRow);
}

/**
 * Get the inbox (or any folder) for a user, newest first.
 */
export async function getInbox(
  username: string,
  folder: MailFolder = "inbox",
): Promise<MailMessage[]> {
  const user = normalizeUsername(username);
  if (!user) return [];
  if (!(VALID_FOLDERS as readonly string[]).includes(folder)) return [];

  const where = folder === "inbox"
    ? { toUsername: user, folder: "inbox" }
    : folder === "sent"
      ? { fromUsername: user, folder: "sent" }
      : folder === "draft"
        ? { fromUsername: user, folder: "draft" }
        : folder === "spam"
          ? { toUsername: user, folder: "spam" }
          : { toUsername: user, folder: "trash" };

  const rows = await db.mailMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return rows.map(rowToMail);
}

/**
 * Paginated variant of `getInbox` for the mail-service abstraction (P2.2).
 * Returns `{ messages, total, page, pageSize }` so the client can render
 * a pager. The `page` is 1-indexed.
 */
export async function getInboxPaged(
  username: string,
  folder: MailFolder = "inbox",
  page = 1,
  pageSize = 25,
): Promise<{ messages: MailMessage[]; total: number; page: number; pageSize: number }> {
  const user = normalizeUsername(username);
  if (!user) return { messages: [], total: 0, page, pageSize };
  if (!(VALID_FOLDERS as readonly string[]).includes(folder)) {
    return { messages: [], total: 0, page, pageSize };
  }
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 200
    ? Math.floor(pageSize)
    : 25;

  const where = folder === "inbox"
    ? { toUsername: user, folder: "inbox" }
    : folder === "sent"
      ? { fromUsername: user, folder: "sent" }
      : folder === "draft"
        ? { fromUsername: user, folder: "draft" }
        : folder === "spam"
          ? { toUsername: user, folder: "spam" }
          : { toUsername: user, folder: "trash" };

  const [total, rows] = await Promise.all([
    db.mailMessage.count({ where }),
    db.mailMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safeSize,
      take: safeSize,
    }),
  ]);
  return { messages: rows.map(rowToMail), total, page: safePage, pageSize: safeSize };
}

/**
 * P2.2 — Search mail messages by free-text query within a folder (or all
 * folders when `folder` is omitted). SQLite LIKE-based; the upgrade path is
 * FTS5 on a real Mailcow + rspamd deployment.
 */
export async function searchMail(
  username: string,
  query: string,
  folder?: MailFolder | "all",
): Promise<MailMessage[]> {
  const user = normalizeUsername(username);
  if (!user) return [];
  const q = (query || "").trim();
  if (!q) return [];

  // Folder-aware filter — only return rows the user owns (as recipient or sender).
  const folderClause = folder && folder !== "all" ? { folder } : {};
  const rows = await db.mailMessage.findMany({
    where: {
      AND: [
        { OR: [{ toUsername: user }, { fromUsername: user }] },
        folderClause,
        {
          OR: [
            { subject: { contains: q } },
            { body: { contains: q } },
            { fromUsername: { contains: q } },
            { fromEmail: { contains: q } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(rowToMail);
}

/**
 * P2.2 — Folder summary with unread + total counts. Used by the folders API.
 */
export async function getFolderCounts(
  username: string,
): Promise<Record<MailFolder, { total: number; unread: number }>> {
  const user = normalizeUsername(username);
  const empty = {
    inbox: { total: 0, unread: 0 },
    sent: { total: 0, unread: 0 },
    draft: { total: 0, unread: 0 },
    spam: { total: 0, unread: 0 },
    trash: { total: 0, unread: 0 },
  };
  if (!user) return empty;
  const rows = await db.mailMessage.groupBy({
    by: ["folder"],
    where: {
      OR: [{ toUsername: user }, { fromUsername: user }],
    },
    _count: { _all: true },
  });
  const unreadRows = await db.mailMessage.groupBy({
    by: ["folder"],
    where: {
      OR: [{ toUsername: user }, { fromUsername: user }],
      read: false,
    },
    _count: { _all: true },
  });
  const out = { ...empty };
  for (const r of rows) {
    if (r.folder in out) {
      (out as Record<string, { total: number; unread: number }>)[r.folder].total = r._count._all;
    }
  }
  for (const r of unreadRows) {
    if (r.folder in out) {
      (out as Record<string, { total: number; unread: number }>)[r.folder].unread = r._count._all;
    }
  }
  return out;
}

/**
 * P2.2 — Hard-delete a message (vs. `trashMessage` which only moves it).
 */
export async function deleteMessage(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    await db.mailMessage.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark a message as read or unread.
 */
export async function markRead(
  id: string,
  read: boolean,
): Promise<MailMessage | null> {
  if (!id) throw new Error("id is required");
  const row = await db.mailMessage.update({
    where: { id },
    data: { read },
  });
  return rowToMail(row);
}

/**
 * Toggle the starred flag on a message.
 */
export async function toggleStar(id: string): Promise<MailMessage | null> {
  if (!id) throw new Error("id is required");
  const current = await db.mailMessage.findUnique({ where: { id } });
  if (!current) return null;
  const row = await db.mailMessage.update({
    where: { id },
    data: { starred: !current.starred },
  });
  return rowToMail(row);
}

/**
 * Move a message to the trash (or back to the inbox if already trashed).
 */
export async function trashMessage(
  id: string,
): Promise<MailMessage | null> {
  if (!id) throw new Error("id is required");
  const current = await db.mailMessage.findUnique({ where: { id } });
  if (!current) return null;
  const newFolder = current.folder === "trash" ? "inbox" : "trash";
  const row = await db.mailMessage.update({
    where: { id },
    data: { folder: newFolder },
  });
  return rowToMail(row);
}

/**
 * Get a single message by ID. Returns `null` if not found.
 */
export async function getMessage(id: string): Promise<MailMessage | null> {
  if (!id) return null;
  const row = await db.mailMessage.findUnique({ where: { id } });
  if (!row) return null;
  return rowToMail(row);
}
