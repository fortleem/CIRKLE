import { NextRequest, NextResponse } from "next/server";
import {
  REGIONS,
  getRegionForCountry,
  regionToPublic,
} from "@/lib/regions";
import {
  RESIDENCY_RULES,
  dataTypesLockedToRegion,
  portableDataTypes,
} from "@/lib/data-residency";
import { signConfig, isUsingDevKeypair, getKeyVersion } from "@/lib/config-signing";
import { logger } from "@/lib/logger";

/**
 * GET /api/regions?country=SA
 *
 * Returns every Cirkle region with its compliance regime, DPO contact, and
 * breach authority, plus (optionally) the caller's resolved region when a
 * `country` query param is supplied.
 *
 * The `dbUrl` field is masked so connection strings are never exposed.
 *
 * Blueprint §4.10 — Signed Configuration: the entire payload is wrapped
 * in an Ed25519 signature envelope so clients can verify provenance
 * before applying any residency / compliance rule. The response shape is:
 *
 *   {
 *     "config": { …regions, residencyRules, resolvedRegion, … },
 *     "signature": "<base64url>",
 *     "canonicalConfig": "<stable JSON string that was signed>",
 *     "algorithm": "ed25519",
 *     "publicKey": "<base64url 32 bytes>",
 *     "signedAt": "<ISO>",
 *     "keyVersion": 1
 *   }
 *
 * Clients verify with Web Crypto:
 *   crypto.subtle.verify("Ed25519", pubKey, signatureBytes,
 *                         new TextEncoder().encode(canonicalConfig))
 */
export async function GET(req: NextRequest) {
  try {
    const country = req.nextUrl.searchParams.get("country") || "";
    const resolved = country
      ? regionToPublic(getRegionForCountry(country))
      : null;

    const regions = REGIONS.map(regionToPublic);

    // Build the unsigned config payload first — this is what we sign.
    const configPayload = {
      regions,
      residencyRules: RESIDENCY_RULES,
      resolvedRegion: resolved,
      // Convenience: which data types are locked vs. portable.
      lockedByRegion: Object.fromEntries(
        REGIONS.filter((r) => r.code !== "GLOBAL").map((r) => [
          r.code,
          dataTypesLockedToRegion(r.code),
        ]),
      ),
      portableTypes: portableDataTypes(),
      generatedAt: new Date().toISOString(),
    };

    // Sign the config (Blueprint §4.10). Best-effort: if signing fails
    // for any reason, we still return the unsigned config so the region
    // lookup keeps working — clients just lose the provenance guarantee.
    let signed: ReturnType<typeof signConfig<typeof configPayload>> | null = null;
    try {
      signed = signConfig(configPayload);
    } catch (err) {
      logger.error("[/api/regions] config signing failed — returning unsigned payload", {
        error: (err as Error).message,
      });
    }

    const payload = signed
      ? {
          config: signed.config,
          signature: signed.signature,
          canonicalConfig: signed.canonicalConfig,
          algorithm: signed.algorithm,
          publicKey: signed.publicKey,
          signedAt: signed.signedAt,
          keyVersion: signed.keyVersion,
          dev: isUsingDevKeypair(),
        }
      : { config: configPayload, signature: null, dev: isUsingDevKeypair() };

    const res = NextResponse.json(payload);
    // Tag the response with the serving region so clients/proxies can see
    // which region answered. In dev this is always GLOBAL.
    res.headers.set(
      "X-Data-Region",
      resolved?.code ?? "GLOBAL",
    );
    // Surface the key version so clients can dispatch on the right verifier
    // without parsing the JSON body (e.g. for caching).
    res.headers.set("X-Config-Signature-Key-Version", String(getKeyVersion()));
    res.headers.set("X-Config-Signature-Algorithm", "ed25519");
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    logger.error("[/api/regions] error", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "failed to load region configuration" },
      { status: 500 },
    );
  }
}
