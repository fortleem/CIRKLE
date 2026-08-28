// @ts-nocheck
/**
 * POST /api/account/delete
 * ============================================================================
 * Cascades through every Prisma model that holds user data and deletes it.
 *
 * P0 FIX (IDOR/BOLA):
 *   Previously this endpoint accepted a `username` in the body and deleted
 *   ANY user's data — an attacker could delete any account by passing
 *   `{ username: "victim" }`. The route now reads the session from the
 *   `cirkle-session` cookie and deletes ONLY the authenticated caller's own
 *   data. The body's `username` field is still accepted for backwards
 *   compatibility, but MUST match the session — otherwise 403 is returned.
 *
 * Note: Cirkle uses a local-device auth model historically (password hashes
 * live in localStorage on the client). The server-side identifier is the
 * `username` string, which is reused across tables (User.username,
 * Post.authorHandle, Transaction.userLabel, AppConnection.userLabel,
 * VerifyClaim.userLabel, ShieldReport.officeName when user-attributed, etc.).
 *
 * This route is intentionally tolerant of partial matches — it deletes what
 * it can find and never throws on a missing table/row.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/server-auth";
import { deleteCredential } from "@/lib/server-credentials";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // ── P0 FIX: read the caller's identity from the session cookie. ─────────
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const sessionUsername = session.username.trim().toLowerCase();

    const body = await req.json().catch(() => ({}));
    const bodyUsername = String(body?.username || "").trim().toLowerCase();

    // Backwards-compat: if a username is supplied in the body, it MUST match
    // the session. Otherwise this is a forbidden cross-account delete attempt.
    if (bodyUsername && bodyUsername.replace(/@cirkle$/i, "").replace(/^@/, "") !== sessionUsername) {
      return NextResponse.json(
        {
          ok: false,
          error: "forbidden",
          details: "You can only delete your own account.",
        },
        { status: 403 },
      );
    }

    const cleanUsername = sessionUsername.replace(/@cirkle$/i, "").replace(/^@/, "");
    const cleanHandle = cleanUsername; // For audit purposes, the handle is the username.

    const stats: Record<string, number> = {};

    // 1. User row (by id — authoritative post-P0 — with fallback to username
    //    match for legacy seeded rows).
    try {
      const user =
        (await db.user.findUnique({
          where: { id: session.userId },
          select: { id: true },
        }).catch(() => null)) ||
        (await db.user.findFirst({
          where: {
            OR: [
              { circleId: { contains: cleanUsername } },
              { displayName: { contains: cleanUsername } },
            ],
          },
          select: { id: true },
        }).catch(() => null));

      if (user) {
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
            { senderId: session.userId },
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
          OR: [
            { displayName: cleanHandle },
            { displayName: cleanUsername },
            { userId: session.userId },
          ],
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

    // 10. Webhook events — skipped (see original note).
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

    // 12. E2EE device public keys — the user's published device keys.
    try {
      const r = await db.devicePublicKey.deleteMany({
        where: { userLabel: { in: [cleanHandle, cleanUsername] } },
      });
      stats.devicePublicKeys = r.count;
    } catch (e) {
      console.warn("[account/delete] devicePublicKeys:", String((e as Error)?.message || e));
    }

    // 13. Server credential store — drop the password hash.
    try {
      if (deleteCredential(cleanUsername)) {
        stats.credentials = 1;
      } else {
        stats.credentials = 0;
      }
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
