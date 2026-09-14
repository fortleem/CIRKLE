// @ts-nocheck
/**
 * CIRKLE — Universal Notification Center
 * ============================================================================
 * A unified notification system that merges every notification source:
 *
 *   • Wasl unread messages            (db.message, status != read)
 *   • Wasl missed calls               (db.callSession, status=missed)
 *   • Midan mentions & replies        (db.post, body contains @handle)
 *   • New followers                   (db.follow)
 *   • CircleMail unread               (db.mailMessage, read=false)
 *   • Circle events                   (db.eventTicket, etc.)
 *   • Job applications                 (db.jobApplication, status=pending)
 *   • Transactions                    (db.transaction, status=pending)
 *   • Inter-agency referrals          (db.interAgencyReferral, status=pending)
 *   • AI action approvals needed      (db.aiAutomationLevel, level>=3)
 *   • Data subject requests           (db.dataSubjectRequest, status=pending)
 *   • AcaCase status updates          (db.acaCase, status changed)
 *   • System events                   (db.aiIncident, status=open)
 *
 * Each notification is normalised into a `UnifiedNotification` record with
 * a `type`, `priority`, `module`, `timestamp`, and `read` flag.
 *
 * Every DB call is wrapped in try/catch — the function NEVER throws; it
 * returns the partial list of notifications it could assemble.
 * ============================================================================
 */

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "message"
  | "mention"
  | "call"
  | "follow"
  | "reply"
  | "event"
  | "job"
  | "official_alert"
  | "travel"
  | "payment"
  | "security"
  | "privacy"
  | "verification"
  | "system"
  | "ai_task"
  | "referral";

export type NotificationPriority = "urgent" | "important" | "normal" | "low";

export interface UnifiedNotification {
  id: string;
  type: NotificationType;
  module: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: an in-memory store for read-state when the DB doesn't have a
// notifications table (the CIRKLE schema has no `Notification` model today).
// ─────────────────────────────────────────────────────────────────────────────

const readState = new Set<string>();

function makeId(prefix: string, source: string): string {
  return `${prefix}:${source}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-source fetchers — each returns UnifiedNotification[] and never throws.
// ─────────────────────────────────────────────────────────────────────────────

async function fetchUnreadMessages(userId?: string): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const msgs = await db.message.findMany({
      where: {
        isDeleted: false,
        OR: [
          { status: { not: "read" } },
          { status: "sent" },
          { status: "delivered" },
        ],
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    for (const m of msgs) {
      const id = makeId("message", m.id);
      out.push({
        id,
        type: "message",
        module: "wasl",
        title: `New message from ${m.senderName}`,
        body: m.body || (m.ciphertext ? "[encrypted message]" : m.systemEvent || ""),
        priority: "normal",
        timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=wasl",
        actionLabel: "Open chat",
        metadata: {
          conversationId: m.conversationId,
          messageId: m.id,
          attachmentKind: m.attachmentKind,
        },
      });
    }
  } catch {
    /* Message table unavailable */
  }
  return out;
}

async function fetchMissedCalls(userId?: string): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const calls = await db.callSession.findMany({
      where: { status: "missed" },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    for (const c of calls) {
      const id = makeId("call", c.id);
      out.push({
        id,
        type: "call",
        module: "wasl",
        title: `Missed ${c.type === "video" ? "video" : "voice"} call`,
        body: `${c.caller} tried to reach you`,
        priority: "important",
        timestamp: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=wasl",
        actionLabel: "Call back",
        metadata: { callId: c.id, callType: c.type },
      });
    }
  } catch {
    /* CallSession table unavailable */
  }
  return out;
}

async function fetchMentionsAndReplies(userId?: string): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    // Posts that mention @handle or have new comments
    const handle = userId ? `@${userId}` : "@";
    const posts = await db.post.findMany({
      where: {
        OR: [{ body: { contains: handle } }, { tags: { contains: "reply" } }],
      },
      take: 30,
      orderBy: { createdAt: "desc" },
    });
    for (const p of posts) {
      const isMention = (p.body || "").toLowerCase().includes(handle.toLowerCase());
      const id = makeId(isMention ? "mention" : "reply", p.id);
      out.push({
        id,
        type: isMention ? "mention" : "reply",
        module: p.module || "midan",
        title: isMention
          ? `${p.authorName} mentioned you`
          : `New reply on ${p.authorName}'s post`,
        body: (p.body || "").slice(0, 200),
        priority: isMention ? "important" : "normal",
        timestamp: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=midan",
        actionLabel: "View post",
        metadata: { postId: p.id, module: p.module },
      });
    }
  } catch {
    /* Post table unavailable */
  }
  return out;
}

async function fetchNewFollowers(userId?: string): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const follows = await db.follow.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    for (const f of follows) {
      const id = makeId("follow", f.id);
      out.push({
        id,
        type: "follow",
        module: "midan",
        title: "New follower",
        body: `@${f.follower} started following you`,
        priority: "normal",
        timestamp: f.createdAt ? new Date(f.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=midan",
        actionLabel: "View profile",
        metadata: { follower: f.follower, following: f.following },
      });
    }
  } catch {
    /* Follow table unavailable */
  }
  return out;
}

async function fetchUnreadMail(userId?: string): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const mail = await db.mailMessage.findMany({
      where: { read: false, folder: "inbox" },
      take: 30,
      orderBy: { createdAt: "desc" },
    });
    for (const m of mail) {
      const id = makeId("mail", m.id);
      out.push({
        id,
        type: "message",
        module: "mail",
        title: m.subject || "(no subject)",
        body: `From @${m.fromUsername}: ${(m.body || "").slice(0, 180)}`,
        priority: "normal",
        timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=mail",
        actionLabel: "Open mail",
        metadata: { mailId: m.id, from: m.fromUsername },
      });
    }
  } catch {
    /* MailMessage table unavailable */
  }
  return out;
}

async function fetchPendingTransactions(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const txns = await db.transaction.findMany({
      where: { status: "pending" },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    for (const t of txns) {
      const id = makeId("payment", t.id);
      const isIncoming = t.direction === "in";
      out.push({
        id,
        type: "payment",
        module: "finance",
        title: isIncoming ? "Incoming payment pending" : "Outgoing payment pending",
        body: `${t.amount} ${t.currency} ${isIncoming ? "from" : "to"} ${t.counterparty}`,
        priority: isIncoming ? "important" : "normal",
        timestamp: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=finance",
        actionLabel: "View transaction",
        metadata: { transactionId: t.id, amount: t.amount, currency: t.currency },
      });
    }
  } catch {
    /* Transaction table unavailable */
  }
  return out;
}

async function fetchJobUpdates(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const apps = await db.jobApplication.findMany({
      where: { status: "pending" },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    for (const a of apps) {
      const id = makeId("job", a.id);
      out.push({
        id,
        type: "job",
        module: "midan",
        title: "Job application update",
        body: `Your application is under review`,
        priority: "normal",
        timestamp: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=midan",
        actionLabel: "View application",
        metadata: { applicationId: a.id, status: a.status },
      });
    }
  } catch {
    /* JobApplication table unavailable */
  }
  return out;
}

async function fetchReferrals(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const refs = await db.interAgencyReferral.findMany({
      where: { status: "pending" },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    for (const r of refs) {
      const id = makeId("referral", r.id);
      out.push({
        id,
        type: "referral",
        module: "circles",
        title: "Inter-agency referral",
        body: `${r.fromInstitution} → ${r.toInstitution}: ${r.purpose}`,
        priority: "urgent",
        timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=circles",
        actionLabel: "Review referral",
        metadata: {
          referralId: r.referralId,
          fromInstitution: r.fromInstitution,
          toInstitution: r.toInstitution,
          purpose: r.purpose,
        },
      });
    }
  } catch {
    /* InterAgencyReferral table unavailable */
  }
  return out;
}

async function fetchAITaskApprovals(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    // High-autonomy AI features need explicit approval
    const levels = await db.aIAutomationLevel.findMany({
      where: { level: { gte: 3 } },
      take: 20,
      orderBy: { setAt: "desc" },
    });
    for (const l of levels) {
      const id = makeId("ai_task", l.id);
      out.push({
        id,
        type: "ai_task",
        module: "ai",
        title: `AI approval needed: ${l.featureName}`,
        body: `Autonomy level ${l.level} — manual review required`,
        priority: "urgent",
        timestamp: l.setAt ? new Date(l.setAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=ai",
        actionLabel: "Review action",
        metadata: { featureId: l.featureId, level: l.level, reason: l.reason },
      });
    }
  } catch {
    /* AIAutomationLevel table unavailable */
  }
  return out;
}

async function fetchPrivacyRequests(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const reqs = await db.dataSubjectRequest.findMany({
      where: { status: "pending" },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    for (const r of reqs) {
      const id = makeId("privacy", r.id);
      out.push({
        id,
        type: "privacy",
        module: "circles",
        title: `Data subject request: ${r.type}`,
        body: `User @${r.username} requested ${r.type}`,
        priority: "important",
        timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=circles",
        actionLabel: "Process request",
        metadata: { requestId: r.id, type: r.type, username: r.username },
      });
    }
  } catch {
    /* DataSubjectRequest table unavailable */
  }
  return out;
}

async function fetchAIIncidents(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const incs = await db.aIIncident.findMany({
      where: { status: "open" },
      take: 10,
      orderBy: { timestamp: "desc" },
    });
    for (const i of incs) {
      const id = makeId("system", i.id);
      out.push({
        id,
        type: "system",
        module: "ai",
        title: `AI incident: ${i.model}`,
        body: i.impact || "An AI incident has been reported",
        priority: "urgent",
        timestamp: i.timestamp ? new Date(i.timestamp).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=ai",
        actionLabel: "View incident",
        metadata: { incidentId: i.incidentId, model: i.model },
      });
    }
  } catch {
    /* AIIncident table unavailable */
  }
  return out;
}

async function fetchAcaCaseUpdates(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const cases = await db.acaCase.findMany({
      where: { status: "investigating" },
      take: 15,
      orderBy: { createdAt: "desc" },
    });
    for (const c of cases) {
      const id = makeId("official_alert", c.id);
      out.push({
        id,
        type: "official_alert",
        module: "circles",
        title: `Case under investigation: ${c.caseNumber || c.id}`,
        body: c.title || c.description || "",
        priority: "important",
        timestamp: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=circles",
        actionLabel: "View case",
        metadata: { caseId: c.id, caseNumber: c.caseNumber, status: c.status },
      });
    }
  } catch {
    /* AcaCase table unavailable */
  }
  return out;
}

async function fetchShieldReports(): Promise<UnifiedNotification[]> {
  const out: UnifiedNotification[] = [];
  try {
    const reports = await db.shieldReport.findMany({
      where: { status: { in: ["pending", "escalated"] } },
      take: 15,
      orderBy: { createdAt: "desc" },
    });
    for (const r of reports) {
      const id = makeId("security", r.id);
      const isEscalated = r.status === "escalated" || r.escalationLevel >= 3;
      out.push({
        id,
        type: "security",
        module: "circles",
        title: `Shield report ${r.caseNumber}: ${r.status}`,
        body: r.title || r.description || "",
        priority: isEscalated ? "urgent" : "important",
        timestamp: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        read: readState.has(id),
        actionUrl: "/?tab=circles",
        actionLabel: "View report",
        metadata: {
          reportId: r.id,
          caseNumber: r.caseNumber,
          escalationLevel: r.escalationLevel,
        },
      });
    }
  } catch {
    /* ShieldReport table unavailable */
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// getUnifiedNotifications — the main aggregator
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnifiedNotifications(
  userId?: string,
): Promise<UnifiedNotification[]> {
  const allSources = await Promise.all([
    fetchUnreadMessages(userId),
    fetchMissedCalls(userId),
    fetchMentionsAndReplies(userId),
    fetchNewFollowers(userId),
    fetchUnreadMail(userId),
    fetchPendingTransactions(),
    fetchJobUpdates(),
    fetchReferrals(),
    fetchAITaskApprovals(),
    fetchPrivacyRequests(),
    fetchAIIncidents(),
    fetchAcaCaseUpdates(),
    fetchShieldReports(),
  ]);

  const merged: UnifiedNotification[] = allSources.flat();

  // Sort by priority (urgent > important > normal > low) then by timestamp desc.
  const priorityWeight: Record<NotificationPriority, number> = {
    urgent: 4,
    important: 3,
    normal: 2,
    low: 1,
  };
  merged.sort((a, b) => {
    const pw = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (pw !== 0) return pw;
    return (
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  return merged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutation: mark as read / mark all as read
// ─────────────────────────────────────────────────────────────────────────────

export async function markAsRead(id: string): Promise<void> {
  if (!id) return;
  readState.add(id);

  // Best-effort: persist read-state back to the source table when the
  // notification id encodes a source row (e.g. `message:<messageId>`).
  const [prefix, sourceId] = id.split(":");
  try {
    if (prefix === "message") {
      await db.message.update({
        where: { id: sourceId },
        data: { status: "read" },
      });
    } else if (prefix === "mail") {
      await db.mailMessage.update({
        where: { id: sourceId },
        data: { read: true },
      });
    }
    // Other prefixes don't have a read-state column today — they remain in
    // the in-memory `readState` Set for the lifetime of the process.
  } catch {
    /* Table may not exist / row may be missing — ignore. */
  }
}

export async function markAllAsRead(): Promise<void> {
  // Pull current set + mark each
  const all = await getUnifiedNotifications();
  await Promise.all(all.map((n) => markAsRead(n.id)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
  try {
    const all = await getUnifiedNotifications();
    return all.filter((n) => !n.read).length;
  } catch {
    return 0;
  }
}

export async function getNotificationsByPriority(
  priority: string,
): Promise<UnifiedNotification[]> {
  try {
    const all = await getUnifiedNotifications();
    return all.filter((n) => n.priority === priority);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// groupNotifications — group by priority band
// ─────────────────────────────────────────────────────────────────────────────

export function groupNotifications(
  notifs: UnifiedNotification[],
): Record<string, UnifiedNotification[]> {
  const groups: Record<string, UnifiedNotification[]> = {
    urgent: [],
    important: [],
    normal: [],
    low: [],
  };
  for (const n of notifs) {
    if (!groups[n.priority]) groups[n.priority] = [];
    groups[n.priority].push(n);
  }
  // Each group sorted by timestamp desc.
  for (const key of Object.keys(groups)) {
    groups[key].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }
  return groups;
}
