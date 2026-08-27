// @ts-nocheck
/**
 * GET /api/services/health
 * ============================================================================
 * Government Digital Health Radar — aggregates outage data from
 * /api/services/outage and reports, per canonical government service,
 * whether the service is currently healthy / degraded / down.
 *
 * The radar is the sovereign-aware companion to service outage reporting:
 *   • It does NOT contact the institution. It aggregates citizen reports.
 *   • It does NOT fabricate statuses. A service is marked "healthy" only
 *     when there are NO recent outage reports; otherwise it is "degraded"
 *     (1–2 reports) or "down" (3+ reports in the last 30 minutes).
 *   • Each service entry carries its real institution name and an
 *     "integration: Pending verification" tag (Chapter LXXXIX) — no live
 *     integration is asserted.
 *
 * Query:  ?window=minutes (default 30) — the rolling window for "recent".
 * Returns:  { ok, generatedAt, windowMinutes, services: ServiceHealth[] }
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ServiceHealth {
  service: string;
  institution: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  openOutages: number;
  recentReports: number;
  lastOutageType?: string;
  lastReportedAt?: string;
  integration: "Pending verification";
}

const SERVICE_INSTITUTIONS: Record<string, string> = {
  eta: "Egyptian Tax Authority (ETA) — e-invoice portal",
  nafeza: "Customs Authority — NAFEZA single-window platform",
  civil_registry: "Civil Registry Authority — civil affairs portal",
  passports: "Passport, Immigration & Nationality Authority — passport services portal",
  traffic_services: "General Directorate of Traffic — licensing & vehicle services portal",
  municipal: "Municipality (regional) — municipal services portal",
  health_services: "Ministry of Health — citizen health services portal",
  education: "Ministry of Education — education services portal",
  labor: "Ministry of Labour — labour services portal",
  courts: "Judiciary — Courts administration services portal",
  government_complaints: "Government Complaints Portal",
};

const ALL_SERVICES = Object.keys(SERVICE_INSTITUTIONS);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const windowMinutes = Math.min(1440, Math.max(5, parseInt(url.searchParams.get("window") || "30", 10)));
    const windowMs = windowMinutes * 60 * 1000;
    const now = Date.now();
    const sinceMs = now - windowMs;

    const outageStore: any[] = (globalThis as any).__CIRKLE_SERVICE_OUTAGE_STORE__ || [];

    const services: ServiceHealth[] = ALL_SERVICES.map((service) => {
      const recent = outageStore.filter(
        (o) => o.service === service && Date.parse(o.lastReported) >= sinceMs,
      );
      const open = outageStore.filter(
        (o) => o.service === service && o.status === "open",
      );
      let status: ServiceHealth["status"] = "healthy";
      if (recent.length >= 3) status = "down";
      else if (recent.length >= 1) status = "degraded";
      if (outageStore.length === 0) status = "unknown";

      const sortedRecent = recent
        .slice()
        .sort((a, b) => Date.parse(b.lastReported) - Date.parse(a.lastReported));
      const last = sortedRecent[0];

      return {
        service,
        institution: SERVICE_INSTITUTIONS[service],
        status,
        openOutages: open.length,
        recentReports: recent.length,
        lastOutageType: last?.outageType,
        lastReportedAt: last?.lastReported,
        integration: "Pending verification" as const,
      };
    });

    const summary = {
      total: services.length,
      healthy: services.filter((s) => s.status === "healthy").length,
      degraded: services.filter((s) => s.status === "degraded").length,
      down: services.filter((s) => s.status === "down").length,
      unknown: services.filter((s) => s.status === "unknown").length,
    };

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        windowMinutes,
        summary,
        services,
        rules: [
          "The radar aggregates citizen outage reports. It does NOT contact the institution.",
          "A service is 'healthy' only when there are no recent outage reports; otherwise 'degraded' (1–2) or 'down' (3+ in the window).",
          "Each service entry carries 'integration: Pending verification' (Chapter LXXXIX) — no live integration is asserted.",
        ],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "health_radar_failed", details: String(err).slice(0, 300) },
      { status: 500 },
    );
  }
}
