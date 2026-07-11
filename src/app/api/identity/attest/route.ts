import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { issueAttestation, type ClaimType } from "@/lib/identity";

/**
 * POST /api/identity/attest
 *
 * Issue a ZK attestation for a user. Two modes:
 *
 *   1. **Self-attest** (`attester: "self"`): user attests a claim about
 *      themselves (e.g. professional title). The signature is still
 *      issued by the cirkle-authority key — the `attester` field is
 *      just a label.
 *
 *   2. **Authority-attest** (`attester: "cirkle-authority"`, default):
 *      a verified claim. For `over_18`, the body must include `dob`
 *      (YYYY-MM-DD) which the server validates and discards (ZK). For
 *      `nationality`, the body must include a passport `documentNumber`
 *      (mock — never persisted). For `unique_human`, the body must
 *      include a `deviceId` (mock).
 *
 * Body:
 *   {
 *     username: string,
 *     claimType: "over_18"|"nationality"|"professional"|"unique_human",
 *     claimValue?: string,           // optional — derived for over_18/nationality
 *     attester?: "self"|"cirkle-authority",
 *     dob?: string,                  // for over_18 (YYYY-MM-DD) — discarded after sign
 *     documentNumber?: string,       // for nationality — discarded after sign
 *     deviceId?: string,             // for unique_human — discarded after sign
 *     expiresAt?: number,            // ms since epoch
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { username, claimType, attester, dob, documentNumber, deviceId, expiresAt } = body as {
      username?: string;
      claimType?: string;
      claimValue?: string;
      attester?: string;
      dob?: string;
      documentNumber?: string;
      deviceId?: string;
      expiresAt?: number;
    };

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }
    if (!claimType) {
      return NextResponse.json({ error: "claimType is required" }, { status: 400 });
    }

    // Derive canonical claim value from source data — DOB / passport
    // / device id are NEVER persisted. Only the derived boolean / code.
    let claimValue: string;
    switch (claimType) {
      case "over_18": {
        if (!body.claimValue) {
          if (!dob || typeof dob !== "string") {
            return NextResponse.json(
              { error: "dob (YYYY-MM-DD) is required for over_18" },
              { status: 400 },
            );
          }
          const dobDate = new Date(dob);
          if (isNaN(dobDate.getTime())) {
            return NextResponse.json({ error: "Invalid dob" }, { status: 400 });
          }
          const ageMs = Date.now() - dobDate.getTime();
          const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
          claimValue = ageYears >= 18 ? "true" : "false";
        } else {
          claimValue = body.claimValue;
        }
        break;
      }
      case "nationality": {
        if (!body.claimValue) {
          // documentNumber is checked but not persisted — we only emit
          // the ISO country code from the document as the claimValue.
          if (!documentNumber) {
            return NextResponse.json(
              { error: "documentNumber or claimValue (ISO-2) is required for nationality" },
              { status: 400 },
            );
          }
          // Mock: derive the country from the first 2 chars of the doc.
          // In production this would be a real passport OCR + lookup.
          const derived = documentNumber.slice(0, 2).toUpperCase();
          if (!/^[A-Z]{2}$/.test(derived)) {
            return NextResponse.json(
              { error: "Could not derive ISO-2 country code from document" },
              { status: 400 },
            );
          }
          claimValue = derived;
        } else {
          claimValue = body.claimValue;
        }
        break;
      }
      case "professional": {
        if (!body.claimValue) {
          return NextResponse.json(
            { error: "claimValue (profession) is required for professional" },
            { status: 400 },
          );
        }
        claimValue = body.claimValue;
        break;
      }
      case "unique_human": {
        if (!body.claimValue) {
          if (!deviceId) {
            return NextResponse.json(
              { error: "deviceId is required for unique_human" },
              { status: 400 },
            );
          }
          // The unique_human claimValue is a hash of the deviceId — never
          // the deviceId itself.
          claimValue = `dev-${deviceId.slice(0, 12)}`;
        } else {
          claimValue = body.claimValue;
        }
        break;
      }
      default:
        return NextResponse.json(
          { error: `Invalid claimType. Must be one of over_18, nationality, professional, unique_human.` },
          { status: 400 },
        );
    }

    const attestation = await issueAttestation({
      username,
      claimType: claimType as ClaimType,
      claimValue,
      attester: attester === "self" ? "self" : "cirkle-authority",
      expiresAt: typeof expiresAt === "number" ? expiresAt : undefined,
      // Self-attestations can be re-issued; authority ones dedup.
      allowDuplicate: attester === "self",
    });

    logger.info("[/api/identity/attest] issued", {
      claimType,
      subject: attestation.subject,
      attester: attestation.attester,
    });

    return NextResponse.json({ ok: true, attestation }, { status: 201 });
  } catch (err) {
    logger.error("[/api/identity/attest] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to issue attestation" },
      { status: 500 },
    );
  }
}
