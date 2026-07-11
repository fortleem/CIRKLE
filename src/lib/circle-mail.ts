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
}

export type MailFolder = "inbox" | "sent" | "draft" | "trash";

// ── Constants ───────────────────────────────────────────────────────────────

export const MAIL_DOMAIN = "cirkle.app";
export const VALID_FOLDERS: readonly MailFolder[] = [
  "inbox",
  "sent",
  "draft",
  "trash",
];

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

  // Two rows: one in the recipient's inbox, one in the sender's sent folder.
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
      folder: "inbox",
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
        : { toUsername: user, folder: "trash" };

  const rows = await db.mailMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return rows.map(rowToMail);
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
