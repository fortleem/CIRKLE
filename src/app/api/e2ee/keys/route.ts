import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface PublishBody {
  userLabel?: string;
  deviceId?: string;
  identityPublicKey?: unknown;
  signingPublicKey?: unknown;
  fingerprint?: string;
}

/**
 * Normalize a Cirkle username (lowercase, strip leading @).
 * Matches the convention used across the app (family-vault, anonymous-identity, etc.).
 */
function normalizeLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/^@/, "");
  return v.length >= 1 && v.length <= 64 ? v : null;
}

/**
 * Validate a JWK-shaped object the client wants to publish. We do NOT verify
 * the cryptographic correctness of the key here (the server is not a crypto
 * oracle) — we only enforce shape + size bounds so peers can't publish junk
 * that breaks their own encryption.
 */
function isJwkLike(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  if (typeof obj.kty !== "string" || obj.kty.length > 8) return false;
  const json = JSON.stringify(v);
  return json.length >= 16 && json.length <= 4096;
}

/**
 * POST /api/e2ee/keys
 *
 * Publish (or rotate) the caller's device public key.
 *
 * Server stores ONLY the public halves (ECDH identity + ECDSA signing) +
 * fingerprint + deviceId. The private keys NEVER transit this endpoint.
 *
 * Idempotent by [userLabel, deviceId]: re-publishing the same deviceId
 * upserts (e.g. after a fingerprint rotation).
 *
 * Body: PublishBody
 * Returns: { ok, deviceId, fingerprint, publishedAt }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as PublishBody | null;
    if (!body) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const userLabel = normalizeLabel(body.userLabel);
    const deviceId = body.deviceId?.trim() ?? "";
    if (!userLabel) {
      return NextResponse.json({ error: "userLabel is required" }, { status: 400 });
    }
    if (!deviceId || deviceId.length > 64) {
      return NextResponse.json({ error: "deviceId is required (max 64 chars)" }, { status: 400 });
    }
    if (!isJwkLike(body.identityPublicKey)) {
      return NextResponse.json({ error: "identityPublicKey must be a JWK object" }, { status: 400 });
    }
    if (!isJwkLike(body.signingPublicKey)) {
      return NextResponse.json({ error: "signingPublicKey must be a JWK object" }, { status: 400 });
    }
    const fingerprint = (body.fingerprint ?? "").trim();
    if (!fingerprint || fingerprint.length > 64) {
      return NextResponse.json({ error: "fingerprint is required (max 64 chars)" }, { status: 400 });
    }

    // Upsert by [userLabel, deviceId]. We deliberately do NOT accept any
    // private-key field — there is no `privateKey` column on this model.
    const identityJson = JSON.stringify(body.identityPublicKey);
    const signingJson = JSON.stringify(body.signingPublicKey);

    const existing = await db.devicePublicKey.findUnique({
      where: { userLabel_deviceId: { userLabel, deviceId } },
    });

    const publishedAt = new Date();
    if (existing) {
      await db.devicePublicKey.update({
        where: { id: existing.id },
        data: {
          identityPublicKey: identityJson,
          signingPublicKey: signingJson,
          fingerprint,
          publishedAt,
        },
      });
    } else {
      await db.devicePublicKey.create({
        data: {
          userLabel,
          deviceId,
          identityPublicKey: identityJson,
          signingPublicKey: signingJson,
          fingerprint,
          publishedAt,
        },
      });
    }

    logger.info("[/api/e2ee/keys POST] published", { userLabel, deviceId, fingerprint });

    return NextResponse.json({
      ok: true,
      deviceId,
      fingerprint,
      publishedAt: publishedAt.toISOString(),
    });
  } catch (err) {
    logger.error("[/api/e2ee/keys POST] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to publish key" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/e2ee/keys?userLabel=<name>
 * GET /api/e2ee/keys?deviceId=<id>
 * GET /api/e2ee/keys                  (list all — admin/dev only)
 *
 * Returns the public key record(s) for the requested user/device. The server
 * NEVER returns private keys (they aren't stored here). If multiple devices
 * exist for a user, returns the most recently published one by default
 * (`?all=1` returns the full list).
 *
 * Response shape (single):
 *   {
 *     userLabel, deviceId, identityPublicKey (JWK object),
 *     signingPublicKey (JWK object), fingerprint, publishedAt
 *   }
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userLabel = normalizeLabel(url.searchParams.get("userLabel") ?? undefined);
    const deviceId = url.searchParams.get("deviceId")?.trim() ?? "";
    const wantAll = url.searchParams.get("all") === "1";

    if (userLabel && deviceId) {
      const row = await db.devicePublicKey.findUnique({
        where: { userLabel_deviceId: { userLabel, deviceId } },
      });
      if (!row) {
        return NextResponse.json(
          { error: "no public key published for this user/device" },
          { status: 404 },
        );
      }
      return NextResponse.json(toPublic(row));
    }

    if (userLabel) {
      const rows = await db.devicePublicKey.findMany({
        where: { userLabel },
        orderBy: { publishedAt: "desc" },
      });
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "no public key published for this user" },
          { status: 404 },
        );
      }
      if (wantAll) {
        return NextResponse.json({ devices: rows.map(toPublic) });
      }
      // Default: return the most-recently published device.
      return NextResponse.json(toPublic(rows[0]));
    }

    if (deviceId) {
      const rows = await db.devicePublicKey.findMany({
        where: { deviceId },
        orderBy: { publishedAt: "desc" },
      });
      if (rows.length === 0) {
        return NextResponse.json(
          { error: "no public key published for this device" },
          { status: 404 },
        );
      }
      return NextResponse.json(toPublic(rows[0]));
    }

    // No filter — list all (dev/admin dashboard use).
    const rows = await db.devicePublicKey.findMany({
      orderBy: { publishedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      devices: rows.map(toPublic),
      count: rows.length,
    });
  } catch (err) {
    logger.error("[/api/e2ee/keys GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch key" },
      { status: 500 },
    );
  }
}

/** Strip internal fields + parse the JSON-blob columns back to JWK objects. */
function toPublic(row: {
  userLabel: string;
  deviceId: string;
  identityPublicKey: string;
  signingPublicKey: string;
  fingerprint: string;
  publishedAt: Date;
}): {
  userLabel: string;
  deviceId: string;
  identityPublicKey: JsonWebKey;
  signingPublicKey: JsonWebKey;
  fingerprint: string;
  publishedAt: string;
} {
  return {
    userLabel: row.userLabel,
    deviceId: row.deviceId,
    identityPublicKey: safeParse(row.identityPublicKey),
    signingPublicKey: safeParse(row.signingPublicKey),
    fingerprint: row.fingerprint,
    publishedAt: row.publishedAt.toISOString(),
  };
}

function safeParse(json: string): JsonWebKey {
  try {
    return JSON.parse(json) as JsonWebKey;
  } catch {
    return {} as JsonWebKey;
  }
}
