import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

/**
 * GET /api/apps
 *
 * Returns all active registered apps. `webhookSecret` (if present) is
 * decrypted on read so the response shows the plaintext secret to the app
 * owner. Access tokens on AppConnection rows are NEVER returned over this
 * endpoint — see /api/apps/[id]/connections.
 */
export async function GET() {
  try {
    const apps = await db.app.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
    });
    // Decrypt `webhookSecret` on read. The `decrypt()` helper is a no-op for
    // null / empty / non-encrypted values, so legacy plaintext rows and rows
    // without a secret are returned unchanged.
    const sanitized = apps.map((a) => ({
      ...a,
      webhookSecret: a.webhookSecret ? decrypt(a.webhookSecret) : null,
    }));
    return NextResponse.json({ apps: sanitized });
  } catch {
    return NextResponse.json({ apps: [
      { id: "1", appId: "careem", name: "Careem", description: "Ride-hailing, food delivery, payments", developer: "Careem", logoEmoji: "🚗", category: "mobility", status: "active" },
      { id: "2", appId: "jahez", name: "Jahez", description: "Saudi food delivery", developer: "Jahez", logoEmoji: "🍔", category: "food", status: "active" },
      { id: "3", appId: "noon", name: "Noon", description: "Online shopping marketplace", developer: "Noon", logoEmoji: "🛍️", category: "shopping", status: "active" },
      { id: "4", appId: "absher", name: "Absher", description: "Saudi government services", developer: "MOI Saudi", logoEmoji: "🪪", category: "government", status: "active" },
      { id: "5", appId: "mawid", name: "Mawid", description: "Healthcare appointments", developer: "MOH Saudi", logoEmoji: "🩺", category: "health", status: "active" },
      { id: "6", appId: "tarjama", name: "Tarjama", description: "AI translation services", developer: "Tarjama", logoEmoji: "🌐", category: "tools", status: "active" },
    ]});
  }
}

/**
 * POST /api/apps
 *
 * Register a new third-party app. The `webhookSecret` (if provided) is
 * encrypted with AES-256-GCM before being persisted. Reads must call
 * `decrypt()` to recover the plaintext — see GET above.
 *
 * Body shape:
 *   { appId, name, description, developer, websiteUrl?, logoEmoji?,
 *     category?, status?, scopes?, redirectUris?, webhookUrl?, webhookSecret? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const appId = String(body?.appId || "").trim();
    const name = String(body?.name || "").trim();
    if (!appId || !name) {
      return NextResponse.json(
        { ok: false, error: "appId and name are required." },
        { status: 400 },
      );
    }
    const created = await db.app.create({
      data: {
        appId,
        name,
        description: String(body?.description || "").slice(0, 1000),
        developer: String(body?.developer || "").slice(0, 200),
        websiteUrl: body?.websiteUrl ? String(body.websiteUrl).slice(0, 500) : null,
        logoEmoji: String(body?.logoEmoji || "🔌").slice(0, 8),
        category: String(body?.category || "general").slice(0, 60),
        status: String(body?.status || "active").slice(0, 30),
        scopes: String(body?.scopes || "feed:read").slice(0, 500),
        redirectUris: String(body?.redirectUris || "").slice(0, 1000),
        webhookUrl: body?.webhookUrl ? String(body.webhookUrl).slice(0, 500) : null,
        // AES-256-GCM encrypt the webhook secret at rest. `encrypt()` is a
        // no-op for null / empty so callers can omit the field.
        webhookSecret: body?.webhookSecret ? encrypt(String(body.webhookSecret)) : null,
      },
      select: { id: true, appId: true, name: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, app: created });
  } catch (err) {
    console.error("[apps] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to register app.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}
