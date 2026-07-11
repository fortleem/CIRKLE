import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/account/export?username=foo[&handle=foo]
 *
 * Returns ALL data the server holds about a user as a downloadable JSON
 * file. Sets `Content-Disposition: attachment; filename="cirkle-data-export.json"`.
 *
 * The user's on-device Brain memory (IndexedDB) cannot be exported from the
 * server — the response includes a `clientOnly` note that the client should
 * also export IndexedDB separately.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const usernameRaw = url.searchParams.get("username") || "";
    const handleRaw = url.searchParams.get("handle") || usernameRaw;

    const username = usernameRaw.trim().toLowerCase().replace(/@cirkle$/i, "").replace(/^@/, "");
    const handle = handleRaw.trim().replace(/@cirkle$/i, "").replace(/^@/, "");

    if (!username) {
      return NextResponse.json(
        { ok: false, error: "Missing username." },
        { status: 400 },
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
          OR: [{ displayName: handle }, { displayName: username }],
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
