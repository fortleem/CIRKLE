import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getInbox,
  getInboxPaged,
  normalizeUsername,
  VALID_FOLDERS,
  type MailFolder,
} from "@/lib/circle-mail";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/inbox — GET the current user's inbox (or any folder).
// GET /api/mail/inbox?username=layla&folder=inbox&page=1
//
// P2.2 — adds `page` query param for pagination. The response is backwards
// compatible: when `page` is omitted the legacy `messages` array shape is
// returned (newest 200). When `page` is supplied, the response includes
// `total`, `page`, and `pageSize` so the client can render a pager.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const username = normalizeUsername(sp.get("username"));
    if (!username) {
      return NextResponse.json(
        { error: "username is required" },
        { status: 400 },
      );
    }
    const folderRaw = sp.get("folder") || "inbox";
    const folder = (VALID_FOLDERS as readonly string[]).includes(folderRaw)
      ? (folderRaw as MailFolder)
      : "inbox";

    const pageRaw = sp.get("page");
    const page = pageRaw ? Number(pageRaw) : undefined;

    if (page !== undefined && Number.isFinite(page) && page > 0) {
      const result = await getInboxPaged(username, folder, page);
      return NextResponse.json({
        folder,
        username,
        messages: result.messages,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      });
    }

    const messages = await getInbox(username, folder);
    return NextResponse.json({ folder, username, messages });
  } catch (err) {
    logger.error("[/api/mail/inbox GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load inbox" },
      { status: 500 },
    );
  }
}
