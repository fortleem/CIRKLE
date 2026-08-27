// @ts-nocheck
/**
 * POST /api/email/send
 * ============================================================================
 * Generic email sending endpoint. Uses the configured SMTP settings.
 *
 * Body:
 *   { to, toName?, subject, bodyHtml, bodyText?, type?, relatedId? }
 *
 * Returns:
 *   { success, messageId?, error? }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body?.to || !body?.subject || !body?.bodyHtml) {
      return NextResponse.json(
        { error: "to, subject, and bodyHtml are required" },
        { status: 400 },
      );
    }

    const result = await sendEmail({
      to: body.to,
      toName: body.toName,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      type: body.type || "notification",
      relatedId: body.relatedId,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "send_failed", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
