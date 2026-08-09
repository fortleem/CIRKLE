import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  sendMail,
  provisionMailbox,
  VALID_FOLDERS,
  type MailFolder,
} from "@/lib/circle-mail";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/send — POST a new mail message.
// Body: { to, from, subject, body, folder? }
//
// P2.2 — adds optional `folder` query/body parameter so the caller can
// override the default recipient folder (e.g. "drafts" to save a draft,
// "spam" for tests). Defaults to the spam-classifier's verdict
// (inbox vs. spam).
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    // Provision (no-op) the sender's mailbox first so the canonical address
    // exists for the fromEmail column.
    if (typeof body.from === "string") {
      await provisionMailbox(body.from);
    }

    // P2.2 — optional folder override. Only "draft" and "spam" are honoured
    // (see SendMailOpts in circle-mail.ts for the rationale).
    let folderOverride: MailFolder | undefined;
    if (typeof body.folder === "string") {
      const f = (VALID_FOLDERS as readonly string[]).includes(body.folder)
        ? (body.folder as MailFolder)
        : undefined;
      if (f === "draft" || f === "spam") {
        folderOverride = f;
      }
    }

    const message = await sendMail({
      to: String(body.to || ""),
      from: String(body.from || ""),
      subject: String(body.subject || ""),
      body: String(body.body || ""),
      folder: folderOverride,
    });

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (err) {
    logger.error("[/api/mail/send POST] error", {
      error: (err as Error).message,
    });
    const msg = err instanceof Error ? err.message : "failed to send mail";
    const status = msg.includes("required") || msg.includes("invalid") || msg.includes("yourself")
      ? 400
      : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

// Mark the route as dynamic so search params / body always re-evaluate.
export const dynamic = "force-dynamic";
