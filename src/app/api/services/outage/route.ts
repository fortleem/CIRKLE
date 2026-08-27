// @ts-nocheck
/**
 * /api/services/outage
 * ============================================================================
 * Service Outage Reporting — Chapter XXX (Multi-Agency Referral) §30.6:
 * when a citizen reports a service outage (portal down, transaction failure,
 * payment problem, etc.), the platform aggregates the report into the
 * government digital health radar (see /api/services/health).
 *
 * POST — report a service outage.
 *   Body:  { service, outageType, description?, country?, city?, location? }
 *   Returns:  { ok, outage, duplicates }
 *
 * GET — list recent outages.
 *   Query:  ?service=...&outageType=...&since=ISO&limit=N
 *   Returns:  { ok, outages }
 *
 * Sovereign rules:
 *   • This endpoint does NOT contact the institution. It records the
 *     citizen report and surfaces it in the health radar.
 *   • Duplicate detection is best-effort — when a similar recent report
 *     exists, the citizen is shown it and given the option to "add my
 *     voice" rather than create a duplicate.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory store. Production replaces this with a Prisma ServiceOutage model.
interface ServiceOutage {
  id: string;
  service: string;
  outageType: string;
  description?: string;
  country?: string;
  city?: string;
  location?: { lat: number; lng: number };
  status: "open" | "confirmed" | "resolved";
  reports: number;
  firstReported: string;
  lastReported: string;
}

const OUTAGE_STORE: ServiceOutage[] = [];
;(globalThis as any).__CIRKLE_SERVICE_OUTAGE_STORE__ = OUTAGE_STORE;

// Canonical Egyptian service identifiers (illustrative, "Pending verification"
// per Chapter LXXXIX — no live integration asserted).
const KNOWN_SERVICES = [
  "eta", // Egyptian Tax Authority e-invoice portal
  "nafeza", // Customs single-window platform
  "civil_registry", // Civil registry portal
  "passports", // Passport services portal
  "traffic_services", // Traffic licensing portal
  "municipal", // Municipal services portal
  "health_services", // Ministry of Health portal
  "education", // Ministry of Education portal
  "labor", // Ministry of Labour portal
  "courts", // Courts services portal
  "government_complaints", // Government complaints portal
];

const KNOWN_OUTAGE_TYPES = [
  "portal_down",
  "transaction_failure",
  "payment_problem",
  "login_failure",
  "data_inconsistency",
  "slow_response",
  "api_error",
  "certificate_expired",
  "other",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const service = String(body.service || "").toLowerCase().trim();
    const outageType = String(body.outageType || "").toLowerCase().trim();

    if (!service) {
      return NextResponse.json(
        { ok: false, error: "service_required", message: "service is required.", knownServices: KNOWN_SERVICES },
        { status: 400 },
      );
    }
    if (!outageType) {
      return NextResponse.json(
        { ok: false, error: "outage_type_required", message: "outageType is required.", knownTypes: KNOWN_OUTAGE_TYPES },
        { status: 400 },
      );
    }

    const description =
      typeof body.description === "string" ? body.description.trim().slice(0, 1000) : undefined;
    const country = typeof body.country === "string" ? body.country.toUpperCase().slice(0, 4) : undefined;
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 80) : undefined;
    const location =
      body.location && typeof body.location.lat === "number" && typeof body.location.lng === "number"
        ? { lat: body.location.lat, lng: body.location.lng }
        : undefined;

    // Duplicate detection — best-effort: same service + same outageType +
    // reported within the last 60 minutes counts as a duplicate.
    const now = Date.now();
    const sixtyMinAgo = now - 60 * 60 * 1000;
    const duplicates = OUTAGE_STORE.filter(
      (o) =>
        o.service === service &&
        o.outageType === outageType &&
        Date.parse(o.lastReported) >= sixtyMinAgo,
    );

    if (duplicates.length > 0) {
      // "Add my voice" — increment the reports counter on the most recent
      // matching outage instead of creating a duplicate.
      const dupe = duplicates[0];
      dupe.reports += 1;
      dupe.lastReported = new Date().toISOString();
      return NextResponse.json(
        {
          ok: true,
          outage: dupe,
          duplicates: duplicates.map(stripOutage),
          addedVoiceTo: dupe.id,
          message:
            "A similar outage was reported recently. Your report was added as a corroborating voice rather than a duplicate.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const outage: ServiceOutage = {
      id: `out_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      service,
      outageType,
      description,
      country,
      city,
      location,
      status: "open",
      reports: 1,
      firstReported: new Date().toISOString(),
      lastReported: new Date().toISOString(),
    };
    OUTAGE_STORE.push(outage);

    return NextResponse.json(
      {
        ok: true,
        outage,
        duplicates: [],
        message: "Outage recorded. It will appear in the government digital health radar.",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "outage_report_failed", details: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const service = url.searchParams.get("service")?.toLowerCase().trim() || "";
    const outageType = url.searchParams.get("outageType")?.toLowerCase().trim() || "";
    const since = url.searchParams.get("since") || "";
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));

    const sinceMs = since ? Date.parse(since) : 0;
    let outages = OUTAGE_STORE.slice();
    if (service) outages = outages.filter((o) => o.service === service);
    if (outageType) outages = outages.filter((o) => o.outageType === outageType);
    if (sinceMs) outages = outages.filter((o) => Date.parse(o.firstReported) >= sinceMs);
    outages.sort((a, b) => Date.parse(b.lastReported) - Date.parse(a.lastReported));
    outages = outages.slice(0, limit).map(stripOutage);

    return NextResponse.json(
      { ok: true, total: outages.length, outages },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "outage_list_failed", details: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}

function stripOutage(o: ServiceOutage) {
  return {
    id: o.id,
    service: o.service,
    outageType: o.outageType,
    description: o.description,
    country: o.country,
    city: o.city,
    location: o.location,
    status: o.status,
    reports: o.reports,
    firstReported: o.firstReported,
    lastReported: o.lastReported,
  };
}
