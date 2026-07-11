import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

/**
 * Cirkle Bot Developer API — register & list bots (mini-apps).
 *
 * A "bot" is just an App row with:
 *   • category="bot"
 *   • webhookUrl (where Cirkle posts events: message, command, payment)
 *   • an ApiKey row whose plaintext is returned ONCE on creation
 *
 * Endpoints:
 *   GET  /api/bots          — list the caller's bots (by developer username)
 *   POST /api/bots          — register a new bot
 *
 * Body for POST:
 *   { name, description, webhookUrl, scopes, developer }
 *
 * The API key is generated server-side (32 hex chars). The plaintext is
 * returned in the POST response so the developer can copy it from the portal
 * — it is NEVER retrievable again (only the SHA-256 hash is persisted).
 */

interface CreateBotBody {
  name?: string;
  description?: string;
  webhookUrl?: string;
  scopes?: string;
  developer?: string;
  logoEmoji?: string;
}

function genAppId(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "bot";
  const suffix = crypto.randomBytes(3).toString("hex");
  return `${slug}-${suffix}`;
}

function genApiKey(): { plaintext: string; keyId: string; keyHash: string } {
  // 32 hex chars = 128 bits of entropy. Displayed in 4-4-4-... groups.
  const raw = crypto.randomBytes(16).toString("hex");
  const plaintext = `cirkle_live_${raw}`;
  const keyId = `kid_${crypto.randomBytes(4).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, keyId, keyHash };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const developer = url.searchParams.get("developer")?.trim().slice(0, 60) || "";
    if (!developer) {
      return NextResponse.json(
        { ok: false, error: "developer query param is required." },
        { status: 400 },
      );
    }
    const apps = await db.app.findMany({
      where: {
        developer,
        category: "bot",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        appId: true,
        name: true,
        description: true,
        developer: true,
        logoEmoji: true,
        category: true,
        status: true,
        scopes: true,
        webhookUrl: true,
        createdAt: true,
        apiKeys: {
          select: { keyId: true, name: true, status: true, lastUsedAt: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return NextResponse.json({ ok: true, bots: apps });
  } catch (err) {
    console.error("[bots] GET fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to list bots.",
        message: String((err as Error)?.message || err || "unknown"),
        bots: [],
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CreateBotBody;
    const name = String(body?.name || "").trim().slice(0, 80);
    const description = String(body?.description || "").trim().slice(0, 1000);
    const webhookUrl = body?.webhookUrl
      ? String(body.webhookUrl).trim().slice(0, 500)
      : null;
    const scopes = String(body?.scopes || "messages:read,messages:send,posts:create")
      .trim()
      .slice(0, 500);
    const developer = String(body?.developer || "").trim().slice(0, 60);
    const logoEmoji = String(body?.logoEmoji || "🤖").slice(0, 8);

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "name is required." },
        { status: 400 },
      );
    }
    if (!developer) {
      return NextResponse.json(
        { ok: false, error: "developer (username) is required." },
        { status: 400 },
      );
    }
    if (webhookUrl) {
      try {
        const u = new URL(webhookUrl);
        if (!/^https?:$/.test(u.protocol)) throw new Error("bad protocol");
      } catch {
        return NextResponse.json(
          { ok: false, error: "webhookUrl must be a valid http(s) URL." },
          { status: 400 },
        );
      }
    }

    const appId = genAppId(name);
    const { plaintext, keyId, keyHash } = genApiKey();

    // Create the App row + the initial ApiKey row in a single transaction so
    // we never end up with an orphan app or an orphan key.
    const [app] = await db.$transaction([
      db.app.create({
        data: {
          appId,
          name,
          description,
          developer,
          websiteUrl: null,
          logoEmoji,
          category: "bot",
          status: "active",
          scopes,
          redirectUris: "",
          webhookUrl,
          webhookSecret: null,
          apiKeys: {
            create: {
              keyId,
              keyHash,
              name: "Default",
              tier: "free",
              scopes,
              status: "active",
              rateLimitPerMin: 60,
            },
          },
        },
        select: {
          id: true,
          appId: true,
          name: true,
          description: true,
          developer: true,
          logoEmoji: true,
          category: true,
          status: true,
          scopes: true,
          webhookUrl: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        bot: app,
        apiKey: {
          keyId,
          /** Plaintext key — shown ONCE. The developer must copy it now. */
          key: plaintext,
          scopes,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[bots] POST fatal:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to register bot.",
        message: String((err as Error)?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}
