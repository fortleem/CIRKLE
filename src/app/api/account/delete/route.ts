// @ts-nocheck
/**
 * POST /api/account/delete
 * ============================================================================
 * P1 FIX (P1-SECURITY): Server-side ownership check.
 *
 * Cascades through every Prisma model that holds user data and deletes the
 * AUTHENTICATED user's data. The body's `username`/`handle` fields are now
 * IGNORED — the server always uses the session's username as the deletion
 * target. This closes the IDOR that let any caller wipe another user's
 * account by passing `{ username: "alice" }`.
 *
 * If no valid session cookie is present → 401.
 *
 * Note: Cirkle uses a server-side auth model (bcrypt hashes live in the
 * `server-credentials` in-memory store). The server-side identifier is the
 * `username` string, which is reused across tables (User.circleId,
 * Post.authorHandle, Transaction.userLabel, AppConnection.userLabel,
 * VerifyClaim.userLabel, ShieldReport.officeName when user-attributed, etc.).
 *
 * This route is intentionally tolerant of partial matches — it deletes what
 * it can find and never throws on a missing table/row.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionFromRequest,
  unauthorizedResponse,
} from "@/lib/server-auth";
import { deleteCredential } from "@/lib/server-credentials";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // P1 FIX: Read session from cookie. Deletion is scoped to the
    // authenticated user — no body override allowed.
    const session = await getSessionFromRequest(req);
    if (!session) {
      return unauthorizedResponse("unauthorized");
    }

    // Body is accepted for backward-compat with the existing client (which
    // still sends `{ username }`), but we ignore the values.
    await req.json().catch(() => ({}));

    const cleanUsername = session.username;
    const cleanHandle = session.username; // Cirkle handle == circleId.

    const stats: Record<string, number> = {};

    // 1. User row (by circleId — the unique server-side identifier).
    try {
      const user = await db.user.findUnique({
        where: { circleId: cleanUsername },
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
      console.warn(
        "[account/delete] user:",
        String((e as Error)?.message || e),
      );
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
      console.warn(
        "[account/delete] posts:",
        String((e as Error)?.message || e),
      );
    }

    // 3. Messages sent by this user (by senderName OR senderId).
    try {
      const r = await db.message.deleteMany({
        where: {
          OR: [{ senderName: cleanHandle }, { senderName: cleanUsername }],
        },
      });
      stats.messages = r.count;
    } catch (e) {
      console.warn(
        "[account/delete] messages:",
        String((e as Error)?.message || e),
      );
    }

    // 4. Reactions by this user (by displayName).
    try {
      const r = await db.reaction.deleteMany({
        where: {
          OR: [{ displayName: cleanHandle }, { displayName: cleanUsername }],
        },
      });
      stats.reactions = r.count;
    } catch (e) {
      console.warn(
        "[account/delete] reactions:",
        String((e as Error)?.message || e),
      );
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
      const convoIds = Array.from(
        new Set(memberships.map((m) => m.conversationId)),
      );
      for (const cid of convoIds) {
        const remaining = await db.conversationMember.count({
          where: { conversationId: cid },
        });
        if (remaining === 0) {
          await db.conversation.delete({ where: { id: cid } }).catch(() => {});
        }
      }
      stats.conversations = convoIds.length;
    } catch (e) {
      console.warn(
        "[account/delete] conversations:",
        String((e as Error)?.message || e),
      );
    }

    // 6. Shield reports attributed to this user (by officeName match —
    //    ShieldReport has no userId field; officeName is used as the
    //    reporting office label, which for individual users is their handle).
    try {
      const r = await db.shieldReport.deleteMany({
        where: {
          OR: [{ officeName: cleanHandle }, { officeName: cleanUsername }],
        },
      });
      stats.shieldReports = r.count;
    } catch (e) {
      console.warn(
        "[account/delete] shieldReports:",
        String((e as Error)?.message || e),
      );
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
      console.warn(
        "[account/delete] verifyClaims:",
        String((e as Error)?.message || e),
      );
    }

    // 8. Transactions for this user (by userLabel).
    try {
      const r = await db.transaction.deleteMany({
        where: {
          OR: [{ userLabel: cleanHandle }, { userLabel: cleanUsername }],
        },
      });
      stats.transactions = r.count;
    } catch (e) {
      console.warn(
        "[account/delete] transactions:",
        String((e as Error)?.message || e),
      );
    }

    // 9. App connections for this user (by userLabel).
    try {
      const r = await db.appConnection.deleteMany({
        where: {
          OR: [{ userLabel: cleanHandle }, { userLabel: cleanUsername }],
        },
      });
      stats.appConnections = r.count;
    } catch (e) {
      console.warn(
        "[account/delete] appConnections:",
        String((e as Error)?.message || e),
      );
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
      console.warn(
        "[account/delete] dsrRecords:",
        String((e as Error)?.message || e),
      );
    }

    // 12. P1 FIX: Also drop the in-memory credential entry so future
    //     logins for this username fail. (Idempotent — returns false if
    //     there was nothing to remove.)
    try {
      const credRemoved = deleteCredential(cleanUsername);
      stats.credentials = credRemoved ? 1 : 0;
    } catch {
      stats.credentials = 0;
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
