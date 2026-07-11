import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getInbox,
  normalizeUsername,
  VALID_FOLDERS,
  type MailFolder,
} from "@/lib/circle-mail";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/inbox — GET the current user's inbox (or any folder).
// GET /api/mail/inbox?username=layla&folder=inbox
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
