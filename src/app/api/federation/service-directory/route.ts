// @ts-nocheck
/**
 * GET  /api/federation/service-directory
 * POST /api/federation/service-directory
 * ============================================================================
 * Citizen Service Directory.
 *
 * GET query params (all optional):
 *   ?q=                      — full-text search (service name, department, category, notes)
 *   ?responsibleInstitution= — filter by responsible institution id
 *   ?category=               — filter by category (e.g. "emergency", "civil_registry", "tax")
 *   ?channel=                — filter by channel (phone|website|office|online)
 *   ?status=                 — filter by status (available|degraded|unavailable)
 *   ?language=               — filter by language (BCP-47, e.g. "ar")
 *
 * POST body:
 *   { serviceName, responsibleInstitution, department, channel, contactInfo, hours,
 *     geographicCoverage, accessibility?, languages?, category?, notes? }
 *
 * Every entry is verified at creation time; entries whose `lastVerified`
 * is older than the freshness window are reported as `degraded`
 * regardless of stored status. No unofficial information is represented
 * as official.
 * ============================================================================
 */
import { NextRequest, NextResponse } from "next/server";
import {
  addService,
  searchServices,
  type ServiceChannel,
  type ServiceStatus,
} from "@/lib/service-directory";

export const dynamic = "force-dynamic";

const ALLOWED_CHANNELS = new Set<ServiceChannel>(["phone", "website", "office", "online"]);
const ALLOWED_STATUSES = new Set<ServiceStatus>(["available", "degraded", "unavailable"]);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const filter: any = {
      q: url.searchParams.get("q")?.trim() || undefined,
      responsibleInstitution: url.searchParams.get("responsibleInstitution")?.trim() || undefined,
      category: url.searchParams.get("category")?.trim() || undefined,
      channel: url.searchParams.get("channel")?.trim() as ServiceChannel | undefined,
      status: url.searchParams.get("status")?.trim() as ServiceStatus | undefined,
      language: url.searchParams.get("language")?.trim() || undefined,
    };
    if (filter.channel && !ALLOWED_CHANNELS.has(filter.channel)) delete filter.channel;
    if (filter.status && !ALLOWED_STATUSES.has(filter.status)) delete filter.status;

    const services = await searchServices(filter);
    return NextResponse.json(
      { total: services.length, services },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_search_services", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    if (!body.serviceName || typeof body.serviceName !== "string") {
      return NextResponse.json({ error: "missing_serviceName" }, { status: 400 });
    }
    if (!body.responsibleInstitution || typeof body.responsibleInstitution !== "string") {
      return NextResponse.json({ error: "missing_responsibleInstitution" }, { status: 400 });
    }
    if (!body.department || typeof body.department !== "string") {
      return NextResponse.json({ error: "missing_department" }, { status: 400 });
    }
    if (!body.channel || !ALLOWED_CHANNELS.has(body.channel)) {
      return NextResponse.json(
        { error: "invalid_channel", allowed: Array.from(ALLOWED_CHANNELS) },
        { status: 400 },
      );
    }
    if (!body.contactInfo || typeof body.contactInfo !== "object" || !body.contactInfo.value) {
      return NextResponse.json({ error: "missing_or_invalid_contactInfo" }, { status: 400 });
    }
    if (!body.hours || typeof body.hours !== "object" || !body.hours.display) {
      return NextResponse.json({ error: "missing_or_invalid_hours" }, { status: 400 });
    }
    if (!body.geographicCoverage || typeof body.geographicCoverage !== "string") {
      return NextResponse.json({ error: "missing_geographicCoverage" }, { status: 400 });
    }

    const entry = await addService({
      serviceName: body.serviceName,
      responsibleInstitution: body.responsibleInstitution,
      department: body.department,
      channel: body.channel,
      contactInfo: body.contactInfo,
      hours: body.hours,
      geographicCoverage: body.geographicCoverage,
      accessibility: Array.isArray(body.accessibility) ? body.accessibility : [],
      languages: Array.isArray(body.languages) ? body.languages : ["ar", "en"],
      category: typeof body.category === "string" ? body.category : undefined,
      notes: body.notes,
    });

    return NextResponse.json({ service: entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "failed_to_add_service", details: String(err).slice(0, 200) },
      { status: 500 },
    );
  }
}
