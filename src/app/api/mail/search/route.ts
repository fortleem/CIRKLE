import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  searchMail,
  normalizeUsername,
  VALID_FOLDERS,
  type MailFolder,
} from "@/lib/circle-mail";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/search — GET search the user's mail by free-text query.
//   GET /api/mail/search?username=layla&q=meeting&folder=inbox
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
    const q = (sp.get("q") || "").trim();
    if (!q) {
      return NextResponse.json({ messages: [] });
    }
    const folderRaw = sp.get("folder") || "all";
    const folder =
      folderRaw === "all" || (VALID_FOLDERS as readonly string[]).includes(folderRaw)
        ? (folderRaw as MailFolder | "all")
        : "all";

    const messages = await searchMail(username, q, folder);
    return NextResponse.json({ username, q, folder, messages });
  } catch (err) {
    logger.error("[/api/mail/search GET] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "search failed" },
      { status: 500 },
    );
  }
}
