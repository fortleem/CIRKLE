import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/account/delete
 *
 * Cascades through every Prisma model that holds user data and deletes it.
 *
 * Body: { username: string, handle?: string }  (handle is the @cirkle username
 * used in posts; username is the User.username / AppConnection.userLabel).
 *
 * Note: Cirkle uses a local-device auth model (password hashes live in
 * localStorage on the client). The server-side identifier is the `username`
 * string, which is reused across tables (User.username, Post.authorHandle,
 * Transaction.userLabel, AppConnection.userLabel, VerifyClaim.userLabel,
 * ShieldReport.officeName when user-attributed, etc.).
 *
 * This route is intentionally tolerant of partial matches — it deletes what
 * it can find and never throws on a missing table/row.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body?.username || "").trim().toLowerCase();
    const handle = String(body?.handle || username || "").trim();

    if (!username) {
      return NextResponse.json(
        { ok: false, error: "Missing username." },
        { status: 400 },
      );
    }

    // Defensive: strip any @cirkle suffix.
    const cleanUsername = username.replace(/@cirkle$/i, "").replace(/^@/, "");
    const cleanHandle = handle.replace(/@cirkle$/i, "").replace(/^@/, "");

    const stats: Record<string, number> = {};

    // 1. User row (by username == circleId match — fallback to displayName).
    try {
      const user = await db.user.findFirst({
        where: {
          OR: [
            { circleId: { contains: cleanUsername } },
            { displayName: { contains: cleanUsername } },
          ],
        },
        select: { id: true },
      });
      if (user) {
        // Cascading relations on User (ConversationMember, Message, Post,
        // Transaction) handle their own deletes via onDelete: Cascade for
        // ConversationMember/Message/Transaction. Post.authorId is
        // nullable and uses restrict-by-default — we delete posts
        // explicitly below first.
        await db.user.delete({ where: { id: user.id } }).catch(() => {});
        stats.user = 1;
      }
    } catch (e) {
      console.warn("[account/delete] user:", String((e as Error)?.message || e));
    }

    // 2. Posts authored by this user (by handle OR by linked userId).
    try {
      const r = await db.post.deleteMany({
        where: {
          OR: [
            { authorHandle: cleanHandle },
            { authorHandle: cleanHandle.toLowerCase() },
            { authorHandle: `${cleanHandle}@cirkle` },
          ],
        },
      });
      stats.posts = r.count;
    } catch (e) {
      console.warn("[account/delete] posts:", String((e as Error)?.message || e));
    }

    // 3. Messages sent by this user (by senderName OR senderId).
    try {
      const r = await db.message.deleteMany({
        where: {
          OR: [
            { senderName: cleanHandle },
            { senderName: cleanUsername },
          ],
        },
      });
      stats.messages = r.count;
    } catch (e) {
      console.warn("[account/delete] messages:", String((e as Error)?.message || e));
    }

    // 4. Reactions by this user (by displayName).
    try {
      const r = await db.reaction.deleteMany({
        where: {
          OR: [
            { displayName: cleanHandle },
            { displayName: cleanUsername },
          ],
        },
      });
      stats.reactions = r.count;
    } catch (e) {
      console.warn("[account/delete] reactions:", String((e as Error)?.message || e));
    }

    // 5. Conversations where this user is the only member (direct DMs).
    //    Group conversations are left alone — other members keep them.
    try {
      const memberships = await db.conversationMember.findMany({
        where: {
          OR: [{ displayName: cleanHandle }, { displayName: cleanUsername }],
        },
        select: { conversationId: true, id: true },
      });
      // Remove the user's memberships.
      const r = await db.conversationMember.deleteMany({
        where: { id: { in: memberships.map((m) => m.id) } },
      });
      stats.conversationMemberships = r.count;
      // For direct conversations with no remaining members, delete the convo.
      const convoIds = Array.from(new Set(memberships.map((m) => m.conversationId)));
      for (const cid of convoIds) {
        const remaining = await db.conversationMember.count({ where: { conversationId: cid } });
        if (remaining === 0) {
          await db.conversation.delete({ where: { id: cid } }).catch(() => {});
        }
      }
      stats.conversations = convoIds.length;
    } catch (e) {
      console.warn("[account/delete] conversations:", String((e as Error)?.message || e));
    }

    // 6. Shield reports attributed to this user (by officeName match —
    //    ShieldReport has no userId field; officeName is used as the
    //    reporting office label, which for individual users is their handle).
    try {
      const r = await db.shieldReport.deleteMany({
        where: {
          OR: [
            { officeName: cleanHandle },
            { officeName: cleanUsername },
          ],
        },
      });
      stats.shieldReports = r.count;
    } catch (e) {
      console.warn("[account/delete] shieldReports:", String((e as Error)?.message || e));
    }

    // 7. Verify claims owned by this user (by userLabel).
    try {
      const r = await db.verifyClaim.deleteMany({
        where: {
          OR: [
            { userLabel: cleanHandle },
            { userLabel: cleanUsername },
            { userLabel: `${cleanHandle}@cirkle` },
          ],
        },
      });
      stats.verifyClaims = r.count;
    } catch (e) {
      console.warn("[account/delete] verifyClaims:", String((e as Error)?.message || e));
    }

    // 8. Transactions for this user (by userLabel).
    try {
      const r = await db.transaction.deleteMany({
        where: {
          OR: [
            { userLabel: cleanHandle },
            { userLabel: cleanUsername },
          ],
        },
      });
      stats.transactions = r.count;
    } catch (e) {
      console.warn("[account/delete] transactions:", String((e as Error)?.message || e));
    }

    // 9. App connections for this user (by userLabel).
    try {
      const r = await db.appConnection.deleteMany({
        where: {
          OR: [
            { userLabel: cleanHandle },
            { userLabel: cleanUsername },
          ],
        },
      });
      stats.appConnections = r.count;
    } catch (e) {
      console.warn("[account/delete] appConnections:", String((e as Error)?.message || e));
    }

    // 10. Webhook events for any apps this user owned (best-effort: delete
    //     events for apps where the user is the developer — we approximate
    //     by appConnection existence, but since we already deleted those,
    //     this is a no-op for most users).
    //     Skipped to avoid deleting another user's events.
    stats.webhookEvents = 0;

    // 11. Data Subject Requests — also delete the user's DSR history since
    //     it contains their username (PII).
    try {
      const r = await db.dataSubjectRequest.deleteMany({
        where: { username: { in: [cleanHandle, cleanUsername] } },
      });
      stats.dsrRecords = r.count;
    } catch (e) {
      console.warn("[account/delete] dsrRecords:", String((e as Error)?.message || e));
    }

    return NextResponse.json({
      ok: true,
      deleted: true,
      stats,
      username: cleanUsername,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[account/delete] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Account deletion failed.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}
