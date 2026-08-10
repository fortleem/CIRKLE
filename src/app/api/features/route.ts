import { NextRequest, NextResponse } from "next/server";
import {
  featureManager,
  type FeatureFlag,
} from "@/lib/feature-manager";
import { getRegionForCountry } from "@/lib/regions";
import { logger } from "@/lib/logger";

/**
 * GET /api/features?country=SA
 *
 * Returns every Cirkle feature flag for the caller's region (Blueprint
 * §4.6 — Dynamic Feature Toggling). The response shape:
 *
 *   {
 *     "country": "SA",
 *     "region": { "code": "KSA", "name": "Saudi Arabia" },
 *     "enabled":  [ { id, label, description, status }, … ],
 *     "disabled": [ { id, label, description, status, disableReason }, … ],
 *     "all":      [ …every feature… ],
 *     "generatedAt": "2024-…"
 *   }
 *
 * Privacy posture: this endpoint reads ONLY the caller's country code
 * (no user ID, no session, no behaviour). The country code is supplied
 * via the `country` query param or, when absent, the `CF-IPCountry` /
 * `X-Vercel-IP-Country` / `Accept-Language` headers (best-effort).
 */
export async function GET(req: NextRequest) {
  try {
    const explicitCountry = req.nextUrl.searchParams.get("country")?.trim();
    const headerCountry =
      req.headers.get("CF-IPCountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-country") ||
      "";
    const country = (explicitCountry || headerCountry || "").toUpperCase();

    const region = country ? getRegionForCountry(country) : null;
    const enabled = featureManager.getEnabledFeatures(country || null);
    const disabled = featureManager.getDisabledFeatures(country || null);
    const all = featureManager.getAllFeatures(country || null);

    const payload: {
      country: string;
      region: { code: string; name: string; compliance: string[] } | null;
      enabled: FeatureFlag[];
      disabled: FeatureFlag[];
      all: FeatureFlag[];
      generatedAt: string;
    } = {
      country: country || "GLOBAL",
      region: region
        ? { code: region.code, name: region.name, compliance: region.compliance }
        : null,
      enabled,
      disabled,
      all,
      generatedAt: new Date().toISOString(),
    };

    const res = NextResponse.json(payload);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Feature-Region", region?.code ?? "GLOBAL");
    return res;
  } catch (err) {
    logger.error("[/api/features GET] error", { error: (err as Error).message });
    return NextResponse.json(
      { error: "failed to resolve feature flags" },
      { status: 500 },
    );
  }
}
