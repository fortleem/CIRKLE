// @ts-nocheck
/**
 * POST /api/email/test
 * ============================================================================
 * Send a test email to verify SMTP settings are working.
 *
 * Body:
 *   { to: string }
 *
 * Returns:
 *   { success, error? }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { testSmtpConnection } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = typeof body?.to === "string" ? body.to : "";

    if (!to) {
      return NextResponse.json({ error: "to (email address) is required" }, { status: 400 });
    }

    const result = await testSmtpConnection(to);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "test_failed", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
