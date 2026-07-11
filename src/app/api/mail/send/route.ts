import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { sendMail, provisionMailbox } from "@/lib/circle-mail";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/send — POST a new mail message.
// Body: { to, from, subject, body }
// Writes one row to the recipient's inbox and one to the sender's sent folder.
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

    const message = await sendMail({
      to: String(body.to || ""),
      from: String(body.from || ""),
      subject: String(body.subject || ""),
      body: String(body.body || ""),
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
