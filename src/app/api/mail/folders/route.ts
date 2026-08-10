import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getFolderCounts,
  normalizeUsername,
  type MailFolder,
} from "@/lib/circle-mail";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/folders — GET the user's folder list with unread + total counts.
//   GET /api/mail/folders?username=layla
// Returns: { folders: [{ folder, total, unread }, ...] }
// ─────────────────────────────────────────────────────────────────────────────

const FOLDER_ORDER: MailFolder[] = ["inbox", "sent", "draft", "spam", "trash"];
const FOLDER_LABELS: Record<MailFolder, string> = {
  inbox: "Inbox",
  sent: "Sent",
  draft: "Drafts",
  spam: "Spam",
  trash: "Trash",
};

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
    const counts = await getFolderCounts(username);
    const folders = FOLDER_ORDER.map((f) => ({
      folder: f === "draft" ? "drafts" : f,
      label: FOLDER_LABELS[f],
      total: counts[f].total,
      unread: counts[f].unread,
    }));
    return NextResponse.json({ username, folders });
  } catch (err) {
    logger.error("[/api/mail/folders GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load folders" },
      { status: 500 },
    );
  }
}
