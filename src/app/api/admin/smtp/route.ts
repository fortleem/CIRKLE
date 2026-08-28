// @ts-nocheck
/**
 * GET  /api/admin/smtp  — get current SMTP settings (password masked)
 * PUT  /api/admin/smtp  — update SMTP settings
 *      body: { host, port, username, password, fromEmail, fromName, encryption, enabled }
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 * (P1 rate-limit wrapper is preserved.)
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/api-rate-limit";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

async function getSmtpHandler(req: NextRequest) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    let settings = await db.smtpSettings.findUnique({ where: { id: "default" } });

    if (!settings) {
      // Return a default template.
      return NextResponse.json({
        configured: false,
        settings: {
          host: "",
          port: 587,
          username: "",
          password: "",
          fromEmail: "",
          fromName: "Cirkle",
          encryption: "starttls",
          enabled: false,
          lastTestSentAt: null,
          lastTestStatus: null,
        },
      });
    }

    return NextResponse.json({
      configured: true,
      enabled: settings.enabled,
      settings: {
        host: settings.host,
        port: settings.port,
        username: settings.username,
        // Mask the password — never return it to the client.
        password: settings.password ? "••••••••" : "",
        passwordSet: !!settings.password,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        encryption: settings.encryption,
        enabled: settings.enabled,
        lastTestSentAt: settings.lastTestSentAt?.toISOString?.() || settings.lastTestSentAt,
        lastTestStatus: settings.lastTestStatus,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_fetch_smtp", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

// P1 FIX: Rate-limited to prevent abuse (SMTP read — 10 req/min)
export const GET = withRateLimit(getSmtpHandler, {
  maxRequests: 10,
  windowMs: 60_000,
  keyBy: "ip",
});

async function putSmtpHandler(req: NextRequest) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const host = typeof body?.host === "string" ? body.host.trim() : "";
    const port = typeof body?.port === "number" ? body.port : 587;
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const fromEmail = typeof body?.fromEmail === "string" ? body.fromEmail.trim() : "";
    const fromName = typeof body?.fromName === "string" ? body.fromName.trim() : "Cirkle";
    const encryption = ["starttls", "ssl", "none"].includes(body?.encryption)
      ? body.encryption
      : "starttls";
    const enabled = typeof body?.enabled === "boolean" ? body.enabled : false;

    if (!host || !fromEmail) {
      return NextResponse.json({ error: "host and fromEmail are required" }, { status: 400 });
    }

    // Build the update data. If password is "••••••••" or empty, keep the existing password.
    const updateData: any = {
      host,
      port,
      username,
      fromEmail,
      fromName,
      encryption,
      enabled,
    };

    // Only update password if a new one was provided (not the mask and not empty).
    if (password && password !== "••••••••") {
      updateData.password = password;
    }

    const settings = await db.smtpSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...updateData,
        password: password && password !== "••••••••" ? password : "",
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      enabled: settings.enabled,
      message: "SMTP settings saved. Use 'Send test email' to verify the connection.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_update_smtp", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

// P1 FIX: Rate-limited to prevent abuse (SMTP update — 10 req/min)
export const PUT = withRateLimit(putSmtpHandler, {
  maxRequests: 10,
  windowMs: 60_000,
  keyBy: "ip",
});
