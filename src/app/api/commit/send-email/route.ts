// @ts-nocheck
/**
 * POST /api/commit/send-email
 * ============================================================================
 * Send a formal AI-generated commit confirmation email.
 *
 * Body:
 *   {
 *     to: string,              // recipient email
 *     toName?: string,
 *     commitTitle: string,
 *     commitDescription: string,
 *     commitType: string,       // price | commodity | agreement | all
 *     parties: [{ name, role }],
 *     amount?: number,
 *     currency?: string,
 *     deadline?: string,
 *     conditions: string[],
 *     isFromInstitution?: boolean,
 *     senderEmail?: string,     // auto-detected for institutions
 *     receiverEmail?: string,   // auto-detected for institutions
 *   }
 *
 * Returns:
 *   { success, messageId?, error?, html? }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { sendCommitConfirmationEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body?.to || !body?.commitTitle) {
      return NextResponse.json(
        { error: "to and commitTitle are required" },
        { status: 400 },
      );
    }

    const result = await sendCommitConfirmationEmail({
      to: body.to,
      toName: body.toName,
      commitTitle: body.commitTitle,
      commitDescription: body.commitDescription || "",
      commitType: body.commitType || "agreement",
      parties: Array.isArray(body.parties) ? body.parties : [],
      amount: typeof body.amount === "number" ? body.amount : undefined,
      currency: body.currency,
      deadline: body.deadline,
      conditions: Array.isArray(body.conditions) ? body.conditions : [],
      isFromInstitution: !!body.isFromInstitution,
      senderEmail: body.senderEmail,
      receiverEmail: body.receiverEmail,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "send_email_failed", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
