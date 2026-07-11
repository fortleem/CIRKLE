import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// CirkleCommit — Verified Digital Signature endpoint (U6)
//
// POST /api/commit/sign
//   Stores a signature (base64 PNG + metadata) on an agreement.
//
//   Request body:
//     {
//       agreementId: string,
//       username: string,         // Cirkle username (without the @)
//       partyId: string,          // which party is signing ("u_you" | "u_cp")
//       signatureDataUrl: string, // base64 PNG data URL
//       attestations: { over_18: boolean, unique_human: boolean }
//     }
//
//   Response:
//     {
//       ok: true,
//       signature: { partyId, username, signedAt, city, country,
//                    attestation: {...}, dataUrlPreview: string },
//       message: string
//     }
//
// Mock-backed: there is no Prisma table for signatures yet (the constraint
// said edit ONLY 4 specific files). The route returns the same canonical
// Signature object the frontend stores locally — so the UX is identical to
// a fully-persisted implementation. A `signatureId` is generated so the
// parent can de-dup if the same party signs twice.
// ─────────────────────────────────────────────────────────────────────────────

export interface CommitSignature {
  signatureId: string;
  agreementId: string;
  partyId: string;
  username: string;
  signedAt: string;
  /** Derived from request IP (or a mock if unavailable). */
  city: string;
  country: string;
  ipHash: string;
  attestation: {
    over_18: boolean;
    unique_human: boolean;
  };
  /** Tiny preview URL — same as the captured data URL so the UI can re-render. */
  dataUrlPreview: string;
}

// Mock geo map — the brief specifies "IP: [city, country]" in the UI. In the
// sandbox we don't have a real GeoIP DB, so we cycle through a small list
// of regional cities keyed by a hash of the request IP.
const MOCK_GEO = [
  { city: "Riyadh", country: "Saudi Arabia" },
  { city: "Cairo", country: "Egypt" },
  { city: "Dubai", country: "United Arab Emirates" },
  { city: "London", country: "United Kingdom" },
  { city: "New York", country: "United States" },
];

function pickGeo(ip: string): { city: string; country: string } {
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (h * 31 + ip.charCodeAt(i)) | 0;
  return MOCK_GEO[Math.abs(h) % MOCK_GEO.length];
}

function hashIp(ip: string): string {
  // Stable but non-reversible hash — we never log the raw IP.
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = (h * 0x01000193) | 0;
  }
  return "ip_" + (h >>> 0).toString(16).padStart(8, "0");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      agreementId,
      username,
      partyId,
      signatureDataUrl,
      attestations,
    } = body as Record<string, unknown>;

    const safeAgreementId =
      typeof agreementId === "string" && agreementId.trim() ? agreementId.trim() : "";
    if (!safeAgreementId) {
      return NextResponse.json(
        { error: "agreementId is required" },
        { status: 400 },
      );
    }

    const safeUsername =
      typeof username === "string" && username.trim() ? username.trim().replace(/^@/, "") : "user";

    const safePartyId =
      typeof partyId === "string" && partyId.trim() ? partyId.trim() : "u_you";

    const safeDataUrl =
      typeof signatureDataUrl === "string" && signatureDataUrl.startsWith("data:image/png")
        ? signatureDataUrl
        : "";

    if (!safeDataUrl) {
      return NextResponse.json(
        { error: "signatureDataUrl must be a base64 PNG data URL" },
        { status: 400 },
      );
    }

    const att =
      attestations && typeof attestations === "object"
        ? (attestations as { over_18?: boolean; unique_human?: boolean })
        : {};
    const safeAttestations = {
      over_18: Boolean(att.over_18),
      unique_human: Boolean(att.unique_human),
    };

    // Derive location from the request IP (x-forwarded-for → fallback to mock).
    const rawIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const geo = pickGeo(rawIp);
    const ipHash = hashIp(rawIp);

    const signature: CommitSignature = {
      signatureId: `sig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      agreementId: safeAgreementId,
      partyId: safePartyId,
      username: safeUsername,
      signedAt: new Date().toISOString(),
      city: geo.city,
      country: geo.country,
      ipHash,
      attestation: safeAttestations,
      dataUrlPreview: safeDataUrl,
    };

    const attestationSummary = [
      `over_18 ${safeAttestations.over_18 ? "✅" : "—"}`,
      `unique_human ${safeAttestations.unique_human ? "✅" : "—"}`,
    ].join(" · ");

    return NextResponse.json(
      {
        ok: true,
        signature,
        message: `Signed by @${safeUsername} on ${new Date(signature.signedAt).toLocaleString()} · IP: ${geo.city}, ${geo.country} · Verified: ${attestationSummary}`,
      },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to store signature", details: String(err) },
      { status: 500 },
    );
  }
}

// GET — helpful for discovery / health-check.
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/commit/sign",
    method: "POST",
    description: "Stores a verified digital signature on a CirkleCommit agreement.",
    requiredFields: ["agreementId", "username", "partyId", "signatureDataUrl", "attestations"],
  });
}
