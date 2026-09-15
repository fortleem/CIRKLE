// @ts-nocheck
// P1 FIX: Rate-limited (30/min — newsSearch preset) + Zod-validated body.
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  sendMail,
  provisionMailbox,
  VALID_FOLDERS,
  type MailFolder,
} from "@/lib/circle-mail";
import { withRateLimit, RATE_LIMIT_PRESETS } from "@/lib/api-rate-limit";
import { validateBody, z } from "@/lib/api-validation";

// ─────────────────────────────────────────────────────────────────────────────
// /api/mail/send — POST a new mail message.
// Body: { to, from, subject, body, folder? }
//
// P2.2 — adds optional `folder` query/body parameter so the caller can
// override the default recipient folder (e.g. "drafts" to save a draft,
// "spam" for tests). Defaults to the spam-classifier's verdict
// (inbox vs. spam).
//
// P1 FIX — wrapped with `withRateLimit` (30 req/min — newsSearch preset)
// and `validateBody` so malformed payloads never reach the mail pipeline.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for `POST /api/mail/send`.
 *   - `to` / `from` are required email-ish strings (capped at 320 chars
 *     which comfortably covers the longest legal RFC 5321 address).
 *   - `subject` is optional but capped at 200 chars (matches the
 *     MailMessage table column width).
 *   - `body` is optional but capped at 32k chars.
 *   - `folder` is optional — only "draft" / "spam" are honoured by the
 *     handler, but we accept the full VALID_FOLDERS set so the schema
 *     doesn't reject folder overrides the handler would silently ignore.
 */
const mailSendSchema = z.object({
  to: z.string().min(3).max(320),
  from: z.string().min(3).max(320),
  subject: z.string().max(200).optional().default(""),
  body: z.string().max(32_000).optional().default(""),
  folder: z.string().max(64).optional(),
});

export const POST = withRateLimit(
  validateBody(mailSendSchema, async (req, body) => {
    try {
      // Provision (no-op) the sender's mailbox first so the canonical address
      // exists for the fromEmail column.
      if (body.from) {
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
        to: body.to,
        from: body.from,
        subject: body.subject,
        body: body.body,
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
  }),
  RATE_LIMIT_PRESETS.newsSearch,
);

// Mark the route as dynamic so search params / body always re-evaluate.
export const dynamic = "force-dynamic";
