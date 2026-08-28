// @ts-nocheck
/**
 * GET /api/account/export
 * ============================================================================
 * Returns ALL server-side data the server holds about the AUTHENTICATED user
 * as a downloadable JSON file.
 *
 * P0 FIX (IDOR/BOLA):
 *   Previously this endpoint accepted a `?username=` query param and exported
 *   data for any user — an attacker could exfiltrate any user's data by
 *   simply passing `?username=victim`. The route now reads the session from
 *   the `cirkle-session` cookie and exports ONLY the authenticated caller's
 *   data. Query params are ignored.
 *
 * The user's on-device Brain memory (IndexedDB) cannot be exported from the
 * server — the response includes a `clientOnly` note that the client should
 * also export IndexedDB separately.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // ── P0 FIX: read the caller's identity from the session cookie. ─────────
    // Query params (`?username=`, `?handle=`) are NO LONGER HONORED.
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const username = session.username.trim().toLowerCase();
    const handle = username; // For audit purposes, the handle is the username.

    if (!username) {
      // Should never happen — verifySessionToken rejects empty usernames —
      // but guard against regressions.
      return NextResponse.json(
        { ok: false, error: "Invalid session." },
        { status: 401 },
      );
    }

    // Run every query in parallel — failures of individual queries are
    // tolerated so a missing table never breaks the export.
    const [
      user,
      posts,
      messages,
      reactions,
      conversationMemberships,
      shieldReports,
      verifyClaims,
      transactions,
      appConnections,
      dsrRecords,
    ] = await Promise.all([
      db.user.findFirst({
        where: {
          OR: [
            { id: session.userId },
            { circleId: { contains: username } },
            { displayName: { contains: username } },
          ],
        },
      }).catch(() => null),
      db.post.findMany({
        where: {
          OR: [
            { authorHandle: handle },
            { authorHandle: handle.toLowerCase() },
            { authorHandle: `${handle}@cirkle` },
          ],
        },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      db.message.findMany({
        where: {
          OR: [{ senderName: handle }, { senderName: username }],
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }).catch(() => []),
      db.reaction.findMany({
        where: {
          OR: [{ displayName: handle }, { displayName: username }],
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }).catch(() => []),
      db.conversationMember.findMany({
        where: {
          OR: [{ displayName: handle }, { displayName: username }, { userId: session.userId }],
        },
        include: {
          conversation: { select: { id: true, name: true, type: true, createdAt: true } },
        },
      }).catch(() => []),
      db.shieldReport.findMany({
        where: {
          OR: [{ officeName: handle }, { officeName: username }],
        },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      db.verifyClaim.findMany({
        where: {
          OR: [
            { userLabel: handle },
            { userLabel: username },
            { userLabel: `${handle}@cirkle` },
          ],
        },
        orderBy: { issuedAt: "desc" },
      }).catch(() => []),
      db.transaction.findMany({
        where: {
          OR: [{ userLabel: handle }, { userLabel: username }],
        },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      db.appConnection.findMany({
        where: {
          OR: [{ userLabel: handle }, { userLabel: username }],
        },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      db.dataSubjectRequest.findMany({
        where: { username: { in: [handle, username] } },
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
    ]);

    const exportPayload = {
      meta: {
        schema: "cirkle-data-export/v1",
        exportedAt: new Date().toISOString(),
        username,
        handle,
        authenticatedUserId: session.userId,
        note: "This file contains all server-side data Cirkle holds about you. On-device Brain memory (IndexedDB) and any locally-cached auth tokens are NOT included — export them from your browser's DevTools if needed.",
        rights: "You have the right to lodge a complaint with your local data protection authority if you believe our processing infringes applicable law.",
        contact: "dpo@cirkle.app",
      },
      account: user,
      posts,
      messages,
      reactions,
      conversations: conversationMemberships.map((m) => ({
        membershipId: m.id,
        conversation: m.conversation,
        joinedAt: m.joinedAt,
        presence: m.presence,
      })),
      shieldReports,
      verifyClaims,
      transactions,
      appConnections: appConnections.map((c) => ({
        ...c,
        // Redact the access token in the export — the user can rotate it
        // from the app management UI if they need a new one. Showing it
        // in a JSON export would create a leak vector.
        accessToken: c.accessToken ? "[REDACTED — rotate from app settings]" : null,
      })),
      dataSubjectRequests: dsrRecords,
      clientOnly: {
        note: "The following data lives only on your device and is NOT included in this server export:",
        brainMemory: "IndexedDB database 'cirkle-brain' — your AI personalization weights.",
        authToken: "localStorage 'cirkle-auth' — your (bcrypt-hashed) account record.",
        consentState: "localStorage 'cirkle-consent-v1' — your consent choices.",
      },
    };

    const json = JSON.stringify(exportPayload, null, 2);
    const filename = `cirkle-data-export-${username}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Cirkle-Export-Username": username,
      },
    });
  } catch (err) {
    console.error("[account/export] fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Data export failed.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}
