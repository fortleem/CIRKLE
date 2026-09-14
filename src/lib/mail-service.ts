/**
 * CIRKLE — Circle Mail Service Abstraction (P2.2, Blueprint §20).
 *
 * Status: WORKING ABSTRACTION.
 *
 * This module is the **service abstraction** over the Circle Mail pillar.
 * The underlying transport today is the internal `@cirkle.app` mail store
 * (Prisma `MailMessage` rows — username → username, no SMTP). The shape of
 * every public function matches what a real Mailcow + SMTP/IMAP deployment
 * would expose so the implementation can be swapped in-place WITHOUT
 * touching call sites (the overlay UI calls only this service).
 *
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Today (sandbox)        ───►  Upgrade path (production)         │
 *   ├─────────────────────────────────┼──────────────────────────────┤
 *   │  Prisma MailMessage rows        │  Mailcow SOGo + Dovecot IMAP   │
 *   │  Internal @cirkle.app delivery  │  Real SMTP via Postfix         │
 *   │  Keyword-based spam filter      │  rspamd + Sieve rules          │
 *   │  /api/mail/* routes             │  IMAP IDLE / SMTP submission   │
 *   │  SQLite LIKE search             │  FTS5 / Dovecot search index   │
 *   └─────────────────────────────────┴──────────────────────────────┘
 *
 * All functions are isomorphic: they hit the existing `/api/mail/*` routes
 * with relative URLs only (so Caddy's gateway can forward correctly). They
 * are safe to call from client components (`"use client"`).
 */

"use client";

// ── Types ───────────────────────────────────────────────────────────────────

export type MailFolder = "inbox" | "sent" | "drafts" | "spam" | "trash";

/** Wire shape from /api/mail/*. */
export interface MailMessageDTO {
  id: string;
  toUsername: string;
  fromUsername: string;
  fromEmail: string;
  subject: string;
  body: string;
  read: boolean;
  starred: boolean;
  folder: string;
  createdAt: string;
}

export interface MailPage {
  messages: MailMessageDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FolderSummary {
  folder: MailFolder;
  total: number;
  unread: number;
}

export interface SendMailInput {
  to: string;
  from: string;
  subject: string;
  body: string;
  /** Optional explicit folder for drafts/spam overrides. */
  folder?: MailFolder;
}

export class MailServiceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = "MailServiceError";
  }
}

// ── Internal mapping ─────────────────────────────────────────────────────────
//
// The Prisma `MailMessage.folder` column uses "draft" (singular) but the
// service-level abstraction exposes "drafts" (plural) so it matches the
// IMAP convention end-users expect. The mapping is local to this file.

const FOLDER_TO_API: Record<MailFolder, string> = {
  inbox: "inbox",
  sent: "sent",
  drafts: "draft",
  spam: "spam",
  trash: "trash",
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send an email. Writes one row to the recipient's inbox (or spam) and one
 * to the sender's sent folder.
 *
 * Returns the recipient-side copy of the message.
 */
export async function sendMail(
  input: SendMailInput,
): Promise<MailMessageDTO> {
  const res = await fetch("/api/mail/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: input.to,
      from: input.from,
      subject: input.subject,
      body: input.body,
      folder: input.folder ? FOLDER_TO_API[input.folder] : undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new MailServiceError(
      (err && typeof err === "object" && "error" in err ? String((err as { error: unknown }).error) : "failed to send mail"),
      res.status,
    );
  }
  const data = (await res.json()) as { ok: boolean; message: MailMessageDTO };
  return data.message;
}

/**
 * Get a folder (inbox/sent/drafts/spam/trash), paginated.
 */
export async function getInbox(
  username: string,
  folder: MailFolder = "inbox",
  page = 1,
): Promise<MailPage> {
  const sp = new URLSearchParams({
    username,
    folder: FOLDER_TO_API[folder] ?? "inbox",
    page: String(page),
  });
  const res = await fetch(`/api/mail/inbox?${sp.toString()}`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new MailServiceError("failed to load folder", res.status);
  }
  const data = (await res.json()) as {
    folder: string;
    username: string;
    messages: MailMessageDTO[];
    total?: number;
    page?: number;
    pageSize?: number;
  };
  return {
    messages: data.messages || [],
    total: data.total ?? data.messages?.length ?? 0,
    page: data.page ?? page,
    pageSize: data.pageSize ?? data.messages?.length ?? 25,
  };
}

/**
 * Get a single email by id.
 *
 * The mail API does not yet expose a single-message endpoint, so we fetch
 * the all-folders list and filter. The upgrade path on a real Mailcow
 * deployment is `GET /api/mail/{id}` (IMAP UID FETCH).
 */
export async function getMail(id: string): Promise<MailMessageDTO | null> {
  if (!id) return null;
  // Loop through folders until we find the message. Short-circuits on hit.
  const folders: MailFolder[] = ["inbox", "sent", "drafts", "spam", "trash"];
  for (const f of folders) {
    const sp = new URLSearchParams({ folder: FOLDER_TO_API[f] });
    const res = await fetch(`/api/mail/inbox?${sp.toString()}`, {
      method: "GET",
    });
    if (!res.ok) continue;
    const data = (await res.json()) as { messages?: MailMessageDTO[] };
    const hit = (data.messages || []).find((m) => m.id === id);
    if (hit) return hit;
  }
  return null;
}

/**
 * Mark a message as read or unread.
 */
export async function markRead(
  id: string,
  read = true,
): Promise<MailMessageDTO> {
  const res = await fetch(`/api/mail/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ read }),
  });
  if (!res.ok) {
    throw new MailServiceError("failed to mark message", res.status);
  }
  const data = (await res.json()) as { ok: boolean; message: MailMessageDTO };
  return data.message;
}

/**
 * Soft-delete a message (moves to trash). Use `permanent: true` to hard-delete.
 */
export async function deleteMail(
  id: string,
  opts: { permanent?: boolean } = {},
): Promise<boolean> {
  if (opts.permanent) {
    const res = await fetch(`/api/mail/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete" }),
    });
    return res.ok;
  }
  const res = await fetch(`/api/mail/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "trash" }),
  });
  return res.ok;
}

/**
 * Search emails by free-text query within a folder (or all folders).
 */
export async function searchMail(
  username: string,
  query: string,
  folder: MailFolder | "all" = "all",
): Promise<MailMessageDTO[]> {
  const sp = new URLSearchParams({
    username,
    q: query,
    folder: folder === "all" ? "all" : FOLDER_TO_API[folder],
  });
  const res = await fetch(`/api/mail/search?${sp.toString()}`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new MailServiceError("search failed", res.status);
  }
  const data = (await res.json()) as { messages?: MailMessageDTO[] };
  return data.messages ?? [];
}

/**
 * Get folder list with unread + total counts. Used to render the sidebar.
 */
export async function getFolders(
  username: string,
): Promise<FolderSummary[]> {
  const sp = new URLSearchParams({ username });
  const res = await fetch(`/api/mail/folders?${sp.toString()}`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new MailServiceError("failed to load folders", res.status);
  }
  const data = (await res.json()) as { folders?: FolderSummary[] };
  return data.folders ?? [];
}

// ── Singleton convenience ────────────────────────────────────────────────────

export const mailService = {
  sendMail,
  getInbox,
  getMail,
  markRead,
  deleteMail,
  searchMail,
  getFolders,
};
