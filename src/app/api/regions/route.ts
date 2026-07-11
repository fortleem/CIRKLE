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
import { logger } from "@/lib/logger";

/**
 * GET /api/regions?country=SA
 *
 * Returns every Cirkle region with its compliance regime, DPO contact, and
 * breach authority, plus (optionally) the caller's resolved region when a
 * `country` query param is supplied.
 *
 * The `dbUrl` field is masked so connection strings are never exposed.
 */
export async function GET(req: NextRequest) {
  try {
    const country = req.nextUrl.searchParams.get("country") || "";
    const resolved = country
      ? regionToPublic(getRegionForCountry(country))
      : null;

    const regions = REGIONS.map(regionToPublic);

    const payload = {
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

    const res = NextResponse.json(payload);
    // Tag the response with the serving region so clients/proxies can see
    // which region answered. In dev this is always GLOBAL.
    res.headers.set(
      "X-Data-Region",
      resolved?.code ?? "GLOBAL",
    );
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
